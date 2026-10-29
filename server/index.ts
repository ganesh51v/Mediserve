// Load environment variables if running in Node with loadEnvFile support
if (typeof (process as any).loadEnvFile === "function") {
  try {
    (process as any).loadEnvFile(".env");
  } catch {
    // .env might not exist in production containers where env vars are injected directly
  }
}

import path from "node:path";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import { SignJWT, jwtVerify, decodeJwt } from "jose";
import bcrypt from "bcryptjs";
import { db, type DBMedicationEvent } from "../src/lib/db.js";
import { startOfDay, endOfDay } from "../src/lib/constants.js";
import { v1Router } from "./v1/routes.js";
import { startDoseReminderWorker } from "./workers/doseReminderWorker.js";
import {
  handleRegister,
  handleLogin,
  handleLogout,
  handleMe,
  checkCsrf,
  revocationStore,
  extractRequestToken,
  verifySessionToken,
  signSessionToken,
} from "./auth.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Clerk config detection ──────────────────────────────────────────────────

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY ?? "";
const CLERK_ENABLED =
  CLERK_SECRET_KEY.length > 0 && !CLERK_SECRET_KEY.includes("PLACEHOLDER");

let clerkBackendPromise: Promise<typeof import("@clerk/backend")> | null = null;
function getClerkBackend() {
  if (!CLERK_ENABLED) return null;
  if (!clerkBackendPromise) {
    clerkBackendPromise = import("@clerk/backend");
  }
  return clerkBackendPromise;
}

// Lazy-load Clerk backend SDK only when needed
let clerkClientPromise: Promise<import("@clerk/backend").ClerkClient> | null = null;
function getClerkClient() {
  if (!CLERK_ENABLED) return null;
  if (!clerkClientPromise) {
    clerkClientPromise = import("@clerk/backend").then(({ createClerkClient }) =>
      createClerkClient({ secretKey: CLERK_SECRET_KEY })
    );
  }
  return clerkClientPromise;
}

if (CLERK_ENABLED) {
  console.log("[MediServe] Clerk authentication ENABLED");
} else {
  console.log("[MediServe] Clerk authentication DISABLED — using built-in JWT (dev mode)");
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-mediserve"
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile app, internal healthchecks)
      if (!origin) return callback(null, true);
      // Allow localhost, 127.0.0.1, Vercel deployments, and Render deployments
      if (
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".onrender.com")
      ) {
        return callback(null, true);
      }
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use("/api/v1", v1Router);

// ─── Health check endpoints ──────────────────────────────────────────────────
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});


// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function signToken(payload: object): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(JWT_SECRET);
}

async function verifyDevToken(token: string): Promise<any> {
  const primarySecret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-mediserve");
  try {
    const { payload } = await jwtVerify(token, primarySecret);
    return payload;
  } catch {
    const fallbackSecret = new TextEncoder().encode("dev-secret-mediserve");
    const { payload } = await jwtVerify(token, fallbackSecret);
    return payload;
  }
}

/**
 * Verify a Clerk session token and resolve to a MediServe session object.
 * Looks up the Clerk user's email in the MemoryDatabase to find the role.
 * Falls back to publicMetadata.role if set in Clerk Dashboard.
 */
async function verifyClerkToken(token: string): Promise<any> {
  const client = await getClerkClient();
  const backend = await getClerkBackend();
  if (!client || !backend) return null;
  try {
    // Verify the JWT and extract the Clerk user id from the session payload
    const payload = await backend.verifyToken(token, { secretKey: CLERK_SECRET_KEY });
    const clerkUserId = (payload as any).sub as string;

    // Fetch the full user from Clerk to get their email and metadata
    const clerkUser = await client.users.getUser(clerkUserId);
    const email =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ?? "";

    // Map to our MemoryDatabase user by email
    const dbUser = db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    // Role: prefer publicMetadata, fall back to db lookup
    const role: string =
      (clerkUser.publicMetadata as any)?.role ?? dbUser?.role ?? "CAREGIVER";

    if (!dbUser) {
      // User exists in Clerk but not in our DB — build a minimal session
      return { id: clerkUserId, email, name: clerkUser.fullName ?? email, role };
    }

    const doctor = db.doctors.find((d) => d.userId === dbUser.id);
    const caregiver = db.caregivers.find((c) => c.userId === dbUser.id);
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role,
      doctorId: doctor?.id,
      caregiverId: caregiver?.id,
    };
  } catch {
    return null;
  }
}

function extractToken(req: express.Request): string | null {
  return extractRequestToken(req);
}

/**
 * Resolve the session from the request.
 * Supports Bearer Authorization header and HttpOnly mediserve_session cookie.
 * 1. Checks revocationStore (server-side logout invalidation)
 * 2. Verifies cryptographic HS256 JWT via verifySessionToken
 * 3. Falls back to Clerk if enabled
 * 4. Decodes claims fallback
 */
async function getSession(req: express.Request): Promise<any> {
  const token = extractToken(req);
  if (!token) return null;
  if (revocationStore.isRevoked(token)) return null;

  try {
    // 1. First check verified session token (includes revocation check and secret validation)
    const verifiedSession = await verifySessionToken(token);
    if (verifiedSession) return verifiedSession;

    // 2. Local HS256 dev token verification
    try {
      const devSession = await verifyDevToken(token);
      if (devSession) return devSession;
    } catch {
      // Not an HS256 token, continue
    }

    // 3. If Clerk is active, verify via Clerk
    if (CLERK_ENABLED) {
      try {
        const clerkSession = await verifyClerkToken(token);
        if (clerkSession) return clerkSession;
      } catch {
        // Clerk verification failed, continue to decoded fallback
      }
    }

    // 4. Fallback: check claims if it's a decoded JWT
    const claims = decodeJwt(token);
    if (claims && (claims.sub || (claims as any).id)) {
      const email = ((claims as any).email || (claims as any).primary_email_address || "") as string;
      const dbUser = db.users.find(
        (u) => (email && u.email.toLowerCase() === email.toLowerCase()) || u.id === (claims.sub || (claims as any).id)
      );
      const role: string = (claims as any).role || dbUser?.role || "CAREGIVER";
      if (dbUser) {
        const doctor = db.doctors.find((d) => d.userId === dbUser.id);
        const caregiver = db.caregivers.find((c) => c.userId === dbUser.id);
        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role,
          doctorId: doctor?.id,
          caregiverId: caregiver?.id,
        };
      }
      return {
        id: (claims.sub || (claims as any).id) as string,
        email: email || (claims.sub as string),
        name: (claims as any).name || email || "User",
        role,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function requireAuth(roles?: string[]) {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    // CSRF check on state mutation requests when cookie-authenticated
    const csrf = checkCsrf(req);
    if (!csrf.safe) {
      res.status(403).json({ error: csrf.reason || "Forbidden: CSRF check failed." });
      return;
    }

    const session = await getSession(req);
    if (!session) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }
    if (roles && !roles.includes(session.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    (req as any).session = session;
    (req as any).user = session;
    next();
  };
}


// ─── Adherence helpers (mirrors src/lib/engines/adherence.ts) ────────────────

function adherenceForPatient(patientId: string, from: Date, to: Date) {
  const events = db.medicationEvents.filter(
    (e) => e.patientId === patientId && e.scheduledAt >= from && e.scheduledAt <= to
  );
  const taken = events.filter((e) => ["DISPENSED", "CONFIRMED"].includes(e.state)).length;
  const missed = events.filter((e) => e.state === "MISSED").length;
  const delayed = events.filter(
    (e) => (e.delayMinutes ?? 0) > 15 && ["DISPENSED", "CONFIRMED"].includes(e.state)
  ).length;
  const failed = events.filter((e) => e.state === "FAILED").length;
  const denom = events.filter(
    (e) => e.state !== "CANCELLED" && e.state !== "SCHEDULED"
  ).length || events.length;
  const ratePct = denom === 0 ? 100 : Math.round((taken / Math.max(denom, 1)) * 1000) / 10;
  return { taken, missed, delayed, failed, total: events.length, ratePct, events };
}

function todayProgress(patientId: string) {
  const stats = adherenceForPatient(patientId, startOfDay(), endOfDay());
  const completed = stats.events.filter((e) => ["DISPENSED", "CONFIRMED"].includes(e.state)).length;
  return { ...stats, completed };
}

// ─── Auth routes ─────────────────────────────────────────────────────────────

app.post("/api/auth/register", handleRegister);
app.post("/api/auth/signup", handleRegister);
app.post("/api/auth/login", handleLogin);
app.post("/api/auth/logout", handleLogout);
app.get("/api/auth/me", handleMe);

// ─── Caregiver routes ─────────────────────────────────────────────────────────

app.get("/api/caregiver/dashboard", requireAuth(["CAREGIVER", "ADMIN"]), async (req, res) => {
  const session = (req as any).session;
  const cg = db.caregivers.find((c) => c.userId === session.id);
  const assignedIds = db.patientAssignments
    .filter((a) => a.active && (session.role === "ADMIN" || a.caregiverId === cg?.id))
    .map((a) => a.patientId);

  const rows = [];
  let missedToday = 0;
  let eventsToday = 0;
  let deviceProblems = 0;

  for (const patientId of assignedIds) {
    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) continue;
    const progress = todayProgress(patientId);
    eventsToday += progress.total;
    missedToday += progress.missed;
    const device = db.devices.find((d) => d.patientId === patientId);
    if (device && (!device.online || ["JAMMED", "SENSOR_ERROR", "LOW_BATTERY", "OFFLINE"].includes(device.simState))) {
      deviceProblems++;
    }
    const alerts = db.alerts.filter((a) => a.patientId === patientId && !a.acknowledged);
    const attention = progress.ratePct < 80 || alerts.some((a) => a.priority !== "INFO") || (device && !device.online);
    rows.push({
      patient,
      adherence: progress.ratePct,
      attention: Boolean(attention),
      status: attention ? "Attention" : "Normal",
      progress,
      alerts: alerts.length,
    });
  }

  res.json({
    patients: rows,
    totals: {
      total: rows.length,
      attention: rows.filter((r) => r.attention).length,
      eventsToday,
      missedToday,
      activeAlerts: rows.reduce((n, r) => n + r.alerts, 0),
      deviceProblems,
    },
  });
});

function buildPatientProfile(patientId: string) {
  const patient = db.patients.find((p) => p.id === patientId);
  if (!patient) return null;
  const today0 = startOfDay();
  const today24 = endOfDay();

  const assignments = db.patientAssignments
    .filter((a) => a.patientId === patientId && a.active)
    .map((a) => ({
      ...a,
      doctor: a.doctorId
        ? (() => {
            const doc = db.doctors.find((d) => d.id === a.doctorId);
            if (!doc) return null;
            return { ...doc, user: db.users.find((u) => u.id === doc.userId) || null };
          })()
        : null,
      caregiver: a.caregiverId
        ? (() => {
            const cg = db.caregivers.find((c) => c.id === a.caregiverId);
            if (!cg) return null;
            return { ...cg, user: db.users.find((u) => u.id === cg.userId) || null };
          })()
        : null,
    }));

  const medicationPlans = db.medicationPlans
    .filter((p) => p.patientId === patientId && p.status === "ACTIVE")
    .map((p) => ({ ...p, medication: db.medications.find((m) => m.id === p.medicationId) || null }));

  const medicationEvents = db.medicationEvents
    .filter((e) => e.patientId === patientId && e.scheduledAt >= today0 && e.scheduledAt <= today24)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .map((e) => {
      const plan = db.medicationPlans.find((p) => p.id === e.planId);
      return { ...e, plan: plan ? { ...plan, medication: db.medications.find((m) => m.id === plan.medicationId) || null } : null };
    });

  const mealSchedules = db.mealSchedules.filter((s) => s.patientId === patientId);
  const mealEvents = db.mealEvents
    .filter((e) => e.patientId === patientId && e.occurredAt >= today0 && e.occurredAt <= today24)
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  const device = db.devices.find((d) => d.patientId === patientId);
  const devices = device
    ? [
        {
          ...device,
          slots: db.deviceSlots.filter((s) => s.deviceId === device.id),
          telemetry: db.deviceTelemetries
            .filter((t) => t.deviceId === device.id)
            .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
            .slice(0, 12),
        },
      ]
    : [];

  const alerts = db.alerts
    .filter((a) => a.patientId === patientId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20);

  const healthMeasurements = db.healthMeasurements
    .filter((m) => m.patientId === patientId)
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
    .slice(0, 20);

  const timelineEvents = db.timelineEvents
    .filter((e) => e.patientId === patientId)
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 40);

  const clinicalNotes = db.clinicalNotes
    .filter((n) => n.patientId === patientId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((n) => {
      const doc = db.doctors.find((d) => d.id === n.doctorId);
      return { ...n, doctor: doc ? { ...doc, user: db.users.find((u) => u.id === doc.userId) || null } : null };
    });

  const progress = todayProgress(patientId);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const week = adherenceForPatient(patientId, weekAgo, endOfDay());

  return {
    patient: { ...patient, assignments, medicationPlans, medicationEvents, mealSchedules, mealEvents, devices, alerts, healthMeasurements, timelineEvents, clinicalNotes },
    progress,
    week,
  };
}

app.get("/api/caregiver/patient/:id", requireAuth(["CAREGIVER", "ADMIN"]), (req, res) => {
  const session = (req as any).session;
  if (session?.role === "CAREGIVER") {
    const cg = db.caregivers.find((c) => c.userId === session.id);
    const assigned = db.patientAssignments.some((a) => a.active && a.patientId === req.params.id && a.caregiverId === cg?.id);
    if (!assigned) {
      res.status(403).json({ error: "Access denied. Patient is not assigned to you." });
      return;
    }
  }
  const profile = buildPatientProfile(req.params.id);
  if (!profile) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }
  res.json(profile);
});

// ─── Caregiver Device Pairing routes ────────────────────────────────────────

app.get("/api/devices/available", requireAuth(["CAREGIVER", "ADMIN"]), (_req, res) => {
  const unassigned = db.devices.filter((d) => !d.patientId);
  res.json({ devices: unassigned });
});

app.post("/api/patients/:id/pair-device", requireAuth(["CAREGIVER", "ADMIN"]), (req, res) => {
  const patientId = req.params.id;
  const { serial } = req.body;
  if (!serial || typeof serial !== "string" || !serial.trim()) {
    res.status(400).json({ error: "Device serial number is required" });
    return;
  }
  const cleanSerial = serial.trim();
  const patient = db.patients.find((p) => p.id === patientId);
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  // Check if device with this serial already exists
  let device = db.devices.find((d) => d.serial.toLowerCase() === cleanSerial.toLowerCase());
  if (device) {
    device.patientId = patientId;
  } else {
    // Register new hardware unit and pair
    device = {
      id: `dev-${Date.now()}`,
      serial: cleanSerial,
      patientId,
      firmware: "esp32-1.0.0",
      simState: "READY",
      online: true,
      batteryPct: 100,
      wifiQuality: "Good",
      door: "Closed",
      motor: "Ready",
      sensors: "Normal",
      lastSeenAt: new Date(),
    };
    db.devices.push(device);
  }

  // Record audit log
  const session = (req as any).session;
  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    userId: session?.id || "system",
    role: session?.role || "CAREGIVER",
    patientId,
    action: "PAIR_HARDWARE_DEVICE",
    previousValue: "NONE",
    newValue: JSON.stringify({ deviceSerial: cleanSerial }),
    deviceId: device.id,
    result: "SUCCESS",
    timestamp: new Date(),
  });

  res.json({ ok: true, device });
});

app.post("/api/patients/:id/unpair-device", requireAuth(["CAREGIVER", "ADMIN"]), (req, res) => {
  const patientId = req.params.id;
  const device = db.devices.find((d) => d.patientId === patientId);
  if (device) {
    device.patientId = null;
  }
  res.json({ ok: true });
});

// ─── Doctor routes ─────────────────────────────────────────────────────────────

app.get("/api/doctor/overview", requireAuth(["DOCTOR", "ADMIN"]), async (req, res) => {
  const session = (req as any).session;
  const doc = db.doctors.find((d) => d.userId === session.id);
  const assignedIds = db.patientAssignments
    .filter((a) => a.active && (session.role === "ADMIN" || a.doctorId === doc?.id))
    .map((a) => a.patientId);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const rows = assignedIds.map((patientId) => {
    const patient = db.patients.find((p) => p.id === patientId);
    const stats = adherenceForPatient(patientId, weekAgo, endOfDay());
    const alerts = db.alerts.filter((a) => a.patientId === patientId && !a.acknowledged).length;
    return { patient, adherence: stats.ratePct, missed: stats.missed, delayed: stats.delayed, events: stats.total, alerts };
  });

  res.json({ rows });
});

app.get("/api/doctor/patient/:id", requireAuth(["DOCTOR", "ADMIN"]), (req, res) => {
  const session = (req as any).session;
  if (session?.role === "DOCTOR") {
    const doc = db.doctors.find((d) => d.userId === session.id);
    const assigned = db.patientAssignments.some((a) => a.active && a.patientId === req.params.id && a.doctorId === doc?.id);
    if (!assigned) {
      res.status(403).json({ error: "Access denied. Patient is not assigned to you." });
      return;
    }
  }
  const profile = buildPatientProfile(req.params.id);
  if (!profile) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }
  res.json(profile);
});

// ─── Alerts ─────────────────────────────────────────────────────────────────

app.get("/api/alerts", requireAuth(), (req, res) => {
  const session = (req as any).session;
  let accessiblePatientIds: Set<string> | null = null;
  if (session?.role === "DOCTOR") {
    const doc = db.doctors.find((d) => d.userId === session.id);
    accessiblePatientIds = new Set(
      db.patientAssignments.filter((a) => a.active && a.doctorId === doc?.id).map((a) => a.patientId)
    );
  } else if (session?.role === "CAREGIVER") {
    const cg = db.caregivers.find((c) => c.userId === session.id);
    accessiblePatientIds = new Set(
      db.patientAssignments.filter((a) => a.active && a.caregiverId === cg?.id).map((a) => a.patientId)
    );
  }
  let alerts = [...db.alerts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (accessiblePatientIds !== null) {
    alerts = alerts.filter((a) => accessiblePatientIds!.has(a.patientId));
  }
  const notifications = db.notifications
    .filter((n) => n.userId === session.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  res.json({ alerts, notifications });
});

app.post("/api/alerts/acknowledge", requireAuth(), (req, res) => {
  const { alertId } = req.body;
  const session = (req as any).session;
  const alert = db.alerts.find((a) => a.id === alertId);
  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }
  alert.acknowledged = true;
  alert.acknowledgedById = session.id;
  db.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: session.id,
    role: session.role,
    patientId: alert.patientId,
    action: "Alert Acknowledged",
    timestamp: new Date(),
    previousValue: "acknowledged: false",
    newValue: "acknowledged: true",
    deviceId: null,
    result: "OK",
  });
  res.json({ ok: true, alert });
});

// ─── Reports ─────────────────────────────────────────────────────────────────

app.get("/api/reports", requireAuth(), (req, res) => {
  const session = (req as any).session;
  const from = new Date();
  from.setDate(from.getDate() - 30);

  let accessiblePatients = db.patients;
  if (session?.role === "DOCTOR") {
    const doc = db.doctors.find((d) => d.userId === session.id);
    const assignedIds = new Set(
      db.patientAssignments.filter((a) => a.active && a.doctorId === doc?.id).map((a) => a.patientId)
    );
    accessiblePatients = db.patients.filter((p) => assignedIds.has(p.id));
  } else if (session?.role === "CAREGIVER") {
    const cg = db.caregivers.find((c) => c.userId === session.id);
    const assignedIds = new Set(
      db.patientAssignments.filter((a) => a.active && a.caregiverId === cg?.id).map((a) => a.patientId)
    );
    accessiblePatients = db.patients.filter((p) => assignedIds.has(p.id));
  }

  const bundles = accessiblePatients.map((patient) => {
    const med = adherenceForPatient(patient.id, from, endOfDay());
    const measurements = db.healthMeasurements
      .filter((m) => m.patientId === patient.id && m.recordedAt >= from)
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
    const alerts = db.alerts
      .filter((a) => a.patientId === patient.id && a.createdAt >= from)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const device = db.devices.find((d) => d.patientId === patient.id) || null;
    return {
      patient,
      report: {
        med: { taken: med.taken, missed: med.missed, delayed: med.delayed, failed: med.failed, ratePct: med.ratePct, total: med.total },
        measurements: measurements.map((m) => ({ id: m.id, type: m.type, value: m.value, unit: m.unit, status: m.status })),
        alerts,
        device,
        dispensing: [],
      },
    };
  });

  res.json({ bundles });
});

// ─── Admin routes ─────────────────────────────────────────────────────────────

app.get("/api/admin/data", requireAuth(["ADMIN"]), (_req, res) => {
  const patients = db.patients;
  const doctors = db.doctors.map((d) => ({ ...d, user: db.users.find((u) => u.id === d.userId) || null }));
  const caregivers = db.caregivers.map((c) => ({ ...c, user: db.users.find((u) => u.id === c.userId) || null }));
  const devices = db.devices;
  const users = db.users.map((u) => ({ id: u.id, name: u.name, role: u.role }));
  res.json({ patients, doctors, caregivers, devices, users });
});

app.post("/api/admin/assign", requireAuth(["ADMIN"]), (req, res) => {
  const { patientId, doctorId, caregiverId } = req.body;
  const existing = db.patientAssignments.find((a) => a.patientId === patientId && a.active);
  if (existing) {
    existing.doctorId = doctorId || existing.doctorId;
    existing.caregiverId = caregiverId || existing.caregiverId;
  } else {
    db.patientAssignments.push({
      id: `asgn-${Date.now()}`,
      patientId,
      doctorId: doctorId || null,
      caregiverId: caregiverId || null,
      active: true,
      createdAt: new Date(),
    });
  }
  res.json({ ok: true });
});

app.get("/api/admin/devices", requireAuth(["ADMIN"]), (_req, res) => {
  const devices = db.devices.map((d) => ({
    ...d,
    slots: db.deviceSlots.filter((s) => s.deviceId === d.id),
    patient: db.patients.find((p) => p.id === d.patientId) || null,
  }));
  res.json({ devices });
});

app.post("/api/admin/devices", requireAuth(["ADMIN"]), (req, res) => {
  const { serial, patientId } = req.body;
  const newDevice = {
    id: `dev-${Date.now()}`,
    serial,
    patientId: patientId || null,
    firmware: "sim-0.1.0",
    simState: "READY",
    online: true,
    batteryPct: 100,
    wifiQuality: "Good",
    door: "Closed",
    motor: "Ready",
    sensors: "Normal",
    lastSeenAt: new Date(),
  };
  db.devices.push(newDevice);
  res.json({ ok: true, device: newDevice });
});

app.get("/api/admin/audit", requireAuth(["ADMIN"]), (_req, res) => {
  const logs = db.auditLogs
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .map((log) => ({
      ...log,
      user: log.userId ? db.users.find((u) => u.id === log.userId) || null : null,
    }));
  res.json({ logs });
});

// ─── Meals ───────────────────────────────────────────────────────────────────

app.post("/api/meals", requireAuth(), (req, res) => {
  const session = (req as any).session;
  const { patientId, kind, eventType, source } = req.body;
  if (!patientId || !kind || !eventType) {
    res.status(400).json({ error: "patientId, kind, eventType are required" });
    return;
  }
  const event = {
    id: `mel-${Date.now()}`,
    patientId,
    kind,
    eventType,
    occurredAt: new Date(),
    source: source || "caregiver",
    notes: "",
  };
  db.mealEvents.push(event);
  db.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: session.id,
    role: session.role,
    patientId,
    action: `Meal Event: ${kind} ${eventType}`,
    timestamp: new Date(),
    previousValue: "",
    newValue: JSON.stringify({ kind, eventType }),
    deviceId: null,
    result: "OK",
  });
  res.json({ ok: true, event });
});

// ─── Plans ────────────────────────────────────────────────────────────────────

app.post("/api/plans", requireAuth(["DOCTOR", "ADMIN"]), (req, res) => {
  const session = (req as any).session;
  const { patientId, medicine, dosage, frequency, scheduledTime, startDate, endDate, mealRelationship, mealKind, deviceSlot, instructions } = req.body;
  if (!patientId || !medicine) {
    res.status(400).json({ error: "patientId and medicine are required" });
    return;
  }
  let med = db.medications.find((m) => m.name.toLowerCase() === medicine.toLowerCase());
  if (!med) {
    med = { id: `med-${Date.now()}`, name: medicine, form: "tablet", strength: dosage || "unknown" };
    db.medications.push(med);
  }
  const plan = {
    id: `plan-${Date.now()}`,
    patientId,
    medicationId: med.id,
    dosage: dosage || "",
    frequency: frequency || "",
    startDate: startDate ? new Date(startDate) : new Date(),
    endDate: endDate ? new Date(endDate) : null,
    scheduledTime: scheduledTime || "08:00",
    mealRelationship: mealRelationship || "NO_MEAL_DEPENDENCY",
    mealKind: mealKind || null,
    instructions: instructions || "",
    deviceSlot: deviceSlot || 1,
    authorizedBy: session.id,
    status: "ACTIVE",
    createdAt: new Date(),
  };
  db.medicationPlans.push(plan);
  db.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: session.id,
    role: session.role,
    patientId,
    action: "Prescription Plan Created",
    timestamp: new Date(),
    previousValue: "NONE",
    newValue: JSON.stringify({ medicine, dosage, frequency, scheduledTime, deviceSlot: plan.deviceSlot }),
    deviceId: null,
    result: "OK",
  });
  res.json({ ok: true, plan });
});

// ─── Notes ────────────────────────────────────────────────────────────────────

app.post("/api/notes", requireAuth(["DOCTOR", "ADMIN"]), (req, res) => {
  const session = (req as any).session;
  const { patientId, body } = req.body;
  if (!patientId || !body) {
    res.status(400).json({ error: "patientId and body are required" });
    return;
  }
  const doctor = db.doctors.find((d) => d.userId === session.id);
  const note = {
    id: `note-${Date.now()}`,
    patientId,
    doctorId: doctor?.id || session.id,
    body,
    createdAt: new Date(),
  };
  db.clinicalNotes.push(note);
  res.json({ ok: true, note });
});

// ─── Simulator & MQTT Telemetry Ring Buffer ────────────────────────────────────

const simMqttLogs: Record<string, Array<{ topic: string; payload: string; timestamp: Date }>> = {};

function pushSimMqtt(deviceId: string, serial: string, topicSuffix: string, data: any) {
  if (!simMqttLogs[deviceId]) {
    simMqttLogs[deviceId] = [];
  }
  const topic = `mediserve/dispenser/${serial}/${topicSuffix}`;
  const payload = JSON.stringify(data);
  simMqttLogs[deviceId].unshift({
    topic,
    payload,
    timestamp: new Date(),
  });
  if (simMqttLogs[deviceId].length > 50) {
    simMqttLogs[deviceId].pop();
  }
}

// Seed initial MQTT messages for each device
for (const dev of db.devices) {
  pushSimMqtt(dev.id, dev.serial, "telemetry", {
    event: "BOOT_HEARTBEAT",
    firmware: dev.firmware || "v1.2.0-esp32",
    batteryPct: dev.batteryPct,
    wifiRssi: -58,
    state: dev.simState || "ONLINE",
    door: dev.door || "Closed",
    motor: dev.motor || "Ready",
    sensors: dev.sensors || "Normal",
    bootAt: dev.lastSeenAt || new Date(),
  });
}

app.get("/api/simulator/data", requireAuth(), (_req, res) => {
  const devices = db.devices.map((d) => {
    const patient = db.patients.find((p) => p.id === d.patientId) || null;
    const slots = db.deviceSlots
      .filter((s) => s.deviceId === d.id)
      .map((s) => {
        const plan = db.medicationPlans.find(
          (p) => p.patientId === d.patientId && p.deviceSlot === s.slotIndex
        );
        const medication = plan ? db.medications.find((m) => m.id === plan.medicationId) : null;
        return {
          ...s,
          slot: s.slotIndex,
          pills: s.count,
          status: s.stock,
          medicineName: medication ? medication.name : (s.stock !== "EMPTY" ? `Slot ${s.slotIndex} Meds` : "Empty Chamber"),
          medicationName: medication ? medication.name : (s.stock !== "EMPTY" ? `Slot ${s.slotIndex} Meds` : "Empty Chamber"),
          dosage: plan ? plan.dosage : "1 Tablet",
          frequency: plan ? plan.frequency : "Daily",
        };
      });

    return {
      ...d,
      patient,
      slots,
    };
  });

  const pending = db.medicationEvents
    .filter((e) => ["DUE", "SCHEDULED", "NOTIFIED", "DISPENSED"].includes(e.state))
    .map((e) => {
      const plan = db.medicationPlans.find((p) => p.id === e.planId);
      const medication = plan ? db.medications.find((m) => m.id === plan.medicationId) : null;
      const patient = db.patients.find((p) => p.id === e.patientId) || null;
      return {
        ...e,
        patient,
        plan: plan
          ? {
              ...plan,
              medication: medication || { id: "unknown", name: "Scheduled Dose", strength: "Standard" },
            }
          : {
              id: "unknown",
              dosage: "Standard Dose",
              medication: { id: "unknown", name: "Scheduled Dose", strength: "Standard" },
            },
      };
    });

  res.json({ devices, pending, messagesByDevice: simMqttLogs });
});

app.post("/api/simulator/tick", requireAuth(), (req, res) => {
  const { deviceId } = req.body;
  const now = new Date();
  const targets = deviceId ? db.devices.filter((d) => d.id === deviceId) : db.devices;

  for (const device of targets) {
    device.lastSeenAt = now;
    // Find pending event for this device or assigned patient
    const pendingEvent = db.medicationEvents.find(
      (e) => (e.deviceId === device.id || e.patientId === device.patientId) && ["DUE", "SCHEDULED", "NOTIFIED"].includes(e.state)
    );

    // Rotate carousel slot & decrement pill stock
    const slots = db.deviceSlots.filter((s) => s.deviceId === device.id);
    const activeSlot = slots.find((s) => s.count > 0) || slots[0];
    if (activeSlot && activeSlot.count > 0) {
      activeSlot.count -= 1;
      if (activeSlot.count === 0) activeSlot.stock = "EMPTY";
      else if (activeSlot.count <= 3) activeSlot.stock = "LOW";
    }

    if (pendingEvent) {
      pendingEvent.state = "DISPENSED";
      pendingEvent.dispensedAt = now;
      pendingEvent.deviceId = device.id;
      db.timelineEvents.push({
        id: `tl-${Date.now()}`,
        patientId: pendingEvent.patientId,
        occurredAt: now,
        title: "Medication dispensed by hardware dispenser",
        detail: `Dispenser ${device.serial} rotated compartment slot ${activeSlot?.slotIndex ?? 1} for Event ${pendingEvent.id}`,
        source: "esp32_dispenser",
      });
    }

    device.simState = "DISPENSED";
    device.door = "Closed";
    device.motor = "Idle (Completed Cycle)";

    // Emit MQTT telemetry packets
    pushSimMqtt(device.id, device.serial, "dispense", {
      action: "MOTOR_STEPPER_CYCLE",
      slot: activeSlot?.slotIndex ?? 1,
      pillsRemaining: activeSlot?.count ?? 0,
      irBeamSensor: "INTERRUPTED",
      chuteWeightSensor: "DETECTED",
      status: "DISPENSED",
      eventId: pendingEvent?.id ?? `manual-test-${Date.now()}`,
      timestamp: now.toISOString(),
    });

    pushSimMqtt(device.id, device.serial, "alert", {
      status: "AWAITING_PATIENT_CONFIRMATION",
      buzzer: "ACTIVE_PULSE_2.4KHZ",
      statusLed: "SOLID_AMBER",
      countdownSeconds: 60,
    });
  }

  res.json({ ok: true, ticked: targets.length });
});

app.post("/api/simulator/confirm", requireAuth(), (req, res) => {
  const { deviceId } = req.body;
  const device = db.devices.find((d) => d.id === deviceId);
  const now = new Date();

  // Find dispensed event awaiting confirmation
  const event = db.medicationEvents.find(
    (e) => (e.deviceId === deviceId || (device && e.patientId === device.patientId)) &&
           ["DISPENSED", "DUE", "NOTIFIED"].includes(e.state)
  );

  if (device) {
    device.simState = "READY";
    device.door = "Closed";
    device.motor = "Ready";

    pushSimMqtt(device.id, device.serial, "confirm", {
      button: "TACTILE_SWITCH_PRESSED",
      eventId: event?.id ?? "none",
      verifiedAt: now.toISOString(),
      buzzer: "SILENCED",
      statusLed: "GREEN_SOLID",
      status: "CONFIRMED",
    });
  }

  if (event) {
    event.state = "CONFIRMED";
    event.confirmedAt = now;
    if (device) event.deviceId = device.id;

    db.timelineEvents.push({
      id: `tl-${Date.now()}`,
      patientId: event.patientId,
      occurredAt: now,
      title: "Patient verified dose taken (Tactile Confirm)",
      detail: `Confirmed at hardware unit ${device?.serial ?? "ESP32"}`,
      source: "patient_physical_confirm",
    });

    // Auto-resolve any unacknowledged dose reminder alert for this patient
    const doseAlert = db.alerts.find(
      (a) => a.patientId === event.patientId && (a.category === "MISSED_DOSE" || a.title.includes("Missed")) && !a.acknowledged
    );
    if (doseAlert) {
      doseAlert.acknowledged = true;
    }
  }

  res.json({ ok: true, event });
});

app.post("/api/simulator/state", requireAuth(), (req, res) => {
  const { deviceId, state } = req.body;
  const device = db.devices.find((d) => d.id === deviceId);
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  const now = new Date();
  device.simState = state;
  device.online = state !== "OFFLINE";

  // Real-time clinical alert & MQTT hardware event integration
  if (state === "JAMMED") {
    device.door = "Ajar / Blocked";
    device.motor = "Stalled (Overcurrent Detected)";
    pushSimMqtt(device.id, device.serial, "alerts", {
      alertType: "CAROUSEL_MOTOR_JAMMED",
      errorCode: 502,
      severity: "CRITICAL",
      currentDrawMa: 850,
      timestamp: now.toISOString(),
    });

    if (device.patientId) {
      db.alerts.push({
        id: `alt-${Date.now()}`,
        patientId: device.patientId,
        category: "HARDWARE_FAILURE",
        priority: "URGENT",
        title: "Dispenser Jammed",
        body: `Hardware Dispenser ${device.serial} carousel motor jammed during rotation. Physical intervention required.`,
        isDiagnosis: false,
        acknowledged: false,
        acknowledgedById: null,
        createdAt: now,
      });
    }
  } else if (state === "LOW_BATTERY") {
    device.batteryPct = 14;
    pushSimMqtt(device.id, device.serial, "telemetry", {
      alertType: "BATTERY_CRITICAL",
      batteryPct: 14,
      voltageMv: 3320,
      timestamp: now.toISOString(),
    });

    if (device.patientId) {
      db.alerts.push({
        id: `alt-${Date.now()}`,
        patientId: device.patientId,
        category: "DEVICE_OFFLINE",
        priority: "WARNING",
        title: "Dispenser Low Battery",
        body: `Hardware Dispenser ${device.serial} battery level is 14%. Reconnect to AC power adapter.`,
        isDiagnosis: false,
        acknowledged: false,
        acknowledgedById: null,
        createdAt: now,
      });
    }
  } else if (state === "SENSOR_ERROR") {
    device.sensors = "IR Beam Fault";
    pushSimMqtt(device.id, device.serial, "alerts", {
      alertType: "OPTICAL_SENSOR_MALFUNCTION",
      errorCode: 505,
      sensor: "IR_CHUTE_DETECTOR",
      timestamp: now.toISOString(),
    });

    if (device.patientId) {
      db.alerts.push({
        id: `alt-${Date.now()}`,
        patientId: device.patientId,
        category: "HARDWARE_FAILURE",
        priority: "URGENT",
        title: "Device Fault - Sensor Error",
        body: `Hardware Dispenser ${device.serial} optical sensor error: chute beam obscured or sensor disconnected.`,
        isDiagnosis: false,
        acknowledged: false,
        acknowledgedById: null,
        createdAt: now,
      });
    }
  } else if (state === "LOW_STOCK") {
    const slots = db.deviceSlots.filter((s) => s.deviceId === device.id);
    for (const slot of slots) {
      if (slot.count > 2) slot.count = 2;
      slot.stock = "LOW";
    }
    pushSimMqtt(device.id, device.serial, "telemetry", {
      alertType: "PILL_COMPARTMENT_LOW_STOCK",
      slots: slots.map((s) => ({ slot: s.slotIndex, count: s.count })),
      timestamp: now.toISOString(),
    });
  } else if (state === "OFFLINE") {
    pushSimMqtt(device.id, device.serial, "status", {
      status: "DISCONNECTED",
      reason: "WIFI_CONNECTION_DROPPED_LWT",
      timestamp: now.toISOString(),
    });
  } else if (state === "ONLINE" || state === "READY") {
    device.door = "Closed";
    device.motor = "Ready";
    device.sensors = "Normal";
    if (device.batteryPct < 25) device.batteryPct = 88;
    pushSimMqtt(device.id, device.serial, "status", {
      status: "SYSTEM_ONLINE_READY",
      wifiRssi: -55,
      batteryPct: device.batteryPct,
      timestamp: now.toISOString(),
    });
  }

  res.json({ ok: true, device });
});

// Immediate test dose trigger
app.post("/api/simulator/trigger-dose", requireAuth(), (req, res) => {
  const { deviceId } = req.body;
  const device = db.devices.find((d) => d.id === deviceId);
  if (!device || !device.patientId) {
    res.status(400).json({ error: "Device has no assigned patient" });
    return;
  }

  const now = new Date();
  const plan = db.medicationPlans.find((p) => p.patientId === device.patientId) || db.medicationPlans[0];
  const med = plan ? db.medications.find((m) => m.id === plan.medicationId) : null;

  const newEvent: DBMedicationEvent = {
    id: `ME-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}-SIM`,
    patientId: device.patientId,
    planId: plan ? plan.id : "plan-sim",
    deviceId: device.id,
    scheduledAt: now,
    state: "DUE",
    eligibleAt: now,
    notifiedAt: now,
    dispensedAt: null,
    confirmedAt: null,
    missedAt: null,
    failedReason: null,
    delayMinutes: 0,
    createdAt: now,
  };

  db.medicationEvents.unshift(newEvent);

  pushSimMqtt(device.id, device.serial, "reminder", {
    alert: "SCHEDULED_MEDICATION_DUE",
    eventId: newEvent.id,
    medication: med?.name || "Prescribed Dose",
    dosage: plan?.dosage || "Standard Dose",
    buzzer: "ACTIVE_PULSE_2.4KHZ",
    statusLed: "FLASHING_AMBER",
    timestamp: now.toISOString(),
  });

  res.json({ ok: true, event: newEvent });
});

// Refill carousel slots
app.post("/api/simulator/refill", requireAuth(), (req, res) => {
  const { deviceId } = req.body;
  const device = db.devices.find((d) => d.id === deviceId);
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  const slots = db.deviceSlots.filter((s) => s.deviceId === device.id);
  for (const s of slots) {
    s.count = 14;
    s.stock = "GOOD";
  }

  pushSimMqtt(device.id, device.serial, "maintenance", {
    action: "CAROUSEL_REFILLED",
    totalSlots: slots.length,
    pillsPerSlot: 14,
    stockStatus: "GOOD",
    timestamp: new Date().toISOString(),
  });

  res.json({ ok: true, slots });
});

// Set battery percentage directly
app.post("/api/simulator/battery", requireAuth(), (req, res) => {
  const { deviceId, batteryPct } = req.body;
  const device = db.devices.find((d) => d.id === deviceId);
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  const pct = Math.max(0, Math.min(100, Number(batteryPct) || 0));
  device.batteryPct = pct;

  if (pct <= 20) {
    device.simState = "LOW_BATTERY";
  }

  pushSimMqtt(device.id, device.serial, "telemetry", {
    batteryPct: pct,
    voltageMv: 3000 + Math.round((pct / 100) * 1200),
    isCharging: false,
    timestamp: new Date().toISOString(),
  });

  res.json({ ok: true, batteryPct: pct });
});

// ─── Physical Device Hardware API (ESP32 Dispenser) ──────────────────────────

app.get("/api/device/command", (req, res) => {
  const serial = req.query.serial as string;
  if (!serial) {
    res.status(400).json({ error: "serial required" });
    return;
  }
  const device = db.devices.find((d) => d.serial === serial);
  if (!device) {
    res.status(404).json({ error: "Unknown device" });
    return;
  }

  // Update device presence
  device.online = true;
  device.lastSeenAt = new Date();

  // Find any pending event for the patient assigned to this dispenser
  const pending = db.medicationEvents.find(
    (e) =>
      e.patientId === device.patientId &&
      ["ELIGIBLE", "NOTIFIED", "DUE"].includes(e.state)
  );

  let command = null;
  if (pending) {
    const plan = db.medicationPlans.find((p) => p.id === pending.planId);
    const medication = plan ? db.medications.find((m) => m.id === plan.medicationId) : null;
    command = {
      type: "DISPENSE",
      eventId: pending.id,
      slot: plan?.deviceSlot ?? 1,
      display: medication?.name ?? "Prescribed Dose",
    };
  }

  res.json({
    deviceId: device.id,
    command,
  });
});

app.post("/api/device/telemetry", (req, res) => {
  const { serial, batteryPct, rssi } = req.body;
  const device = db.devices.find((d) => d.serial === String(serial ?? ""));
  if (!device) {
    res.status(404).json({ error: "Unknown device" });
    return;
  }

  device.online = true;
  device.lastSeenAt = new Date();
  if (typeof batteryPct === "number") {
    device.batteryPct = batteryPct;
  }
  if (typeof rssi === "number") {
    device.wifiQuality = rssi >= -60 ? "Good" : rssi >= -75 ? "Fair" : "Poor";
  }

  db.deviceTelemetries.push({
    id: `tel-${Date.now()}`,
    deviceId: device.id,
    batteryPct: device.batteryPct,
    wifiRssi: typeof rssi === "number" ? rssi : -60,
    online: true,
    recordedAt: new Date(),
  });

  res.json({ ok: true });
});

app.post("/api/device/command", (req, res) => {
  const { serial, eventId, result, slot } = req.body;
  const device = db.devices.find((d) => d.serial === String(serial ?? ""));
  if (!device) {
    res.status(404).json({ error: "Unknown device" });
    return;
  }

  device.online = true;
  device.lastSeenAt = new Date();

  if (eventId) {
    const event = db.medicationEvents.find((e) => e.id === eventId);
    if (event) {
      if (result === "OK") {
        event.state = "DISPENSED";
        event.dispensedAt = new Date();
        db.timelineEvents.push({
          id: `tl-${Date.now()}`,
          patientId: event.patientId,
          occurredAt: new Date(),
          title: "Medication dispensed by physical hardware",
          detail: `Dispensed from carousel slot ${slot || 1} on unit ${device.serial}`,
          source: "hardware",
        });
      } else {
        event.state = "FAILED";
        db.timelineEvents.push({
          id: `tl-${Date.now()}`,
          patientId: event.patientId,
          occurredAt: new Date(),
          title: "Hardware dispense failure",
          detail: `Dispense failed on unit ${device.serial}: ${result}`,
          source: "hardware",
        });
      }
    }
  }

  res.json({ ok: true });
});

// ─── Serve client SPA in production ──────────────────────────────────────────

const clientDist = fs.existsSync(path.resolve(process.cwd(), "dist/index.html"))
  ? path.resolve(process.cwd(), "dist")
  : path.resolve(process.cwd(), "dist/client");

if (fs.existsSync(path.join(clientDist, "index.html"))) {
  app.use(express.static(clientDist));
  // SPA fallback for client-side routing
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

const isTestRunner =
  process.argv.some((arg) => arg.includes("test")) ||
  process.env.NODE_ENV === "test" ||
  Boolean(process.env.VITEST);

const isServerless =
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.LAMBDA_TASK_ROOT);

if (!isTestRunner && !isServerless) {
  const portNumber = Number(PORT) || 3001;
  app.listen(portNumber, "0.0.0.0", () => {
    console.log(`MediServe API running on http://0.0.0.0:${portNumber}`);
    startDoseReminderWorker();
  });
}

export default app;
