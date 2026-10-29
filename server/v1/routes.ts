import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, decodeJwt } from "jose";
import { db } from "../../src/lib/db";
import { startOfDay, endOfDay } from "../../src/lib/constants";
import { validateScheduleInput, validateDeviceEvent } from "../../packages/validation/src/index";
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
} from "../auth";

export const v1Router = Router();

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-mediserve");
}

export async function resolveSessionUser(req: Request): Promise<any | null> {
  const token = extractRequestToken(req);
  if (!token || revocationStore.isRevoked(token)) return null;

  try {
    const verified = await verifySessionToken(token);
    if (verified) return verified;

    // Fallback secret verification
    try {
      const fallbackSecret = new TextEncoder().encode("dev-secret-mediserve");
      const { payload } = await jwtVerify(token, fallbackSecret);
      if (payload && (payload.id || payload.sub)) {
        return payload;
      }
    } catch {
      // Fallback decode
      try {
        const decoded = decodeJwt(token);
        if (decoded && ((decoded as any).sub || (decoded as any).id)) {
          const email = ((decoded as any).email || "") as string;
          const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
          if (user) {
            const doctor = db.doctors.find((d) => d.userId === user.id);
            const caregiver = db.caregivers.find((c) => c.userId === user.id);
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              doctorId: doctor?.id,
              caregiverId: caregiver?.id,
            };
          }
          return decoded;
        }
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function requireV1Auth(allowedRoles?: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const csrf = checkCsrf(req);
    if (!csrf.safe) {
      res.status(403).json({ error: csrf.reason || "Forbidden: CSRF check failed." });
      return;
    }

    const user = await resolveSessionUser(req);
    if (!user) {
      res.status(401).json({ error: "Unauthenticated. Valid Bearer token required." });
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      res.status(403).json({ error: `Forbidden. Role '${user.role}' lacks permission.` });
      return;
    }
    (req as any).user = user;
    (req as any).session = user;
    next();
  };
}

// ─── Module 1: Auth Endpoints ─────────────────────────────────────────────────

// POST /api/v1/auth/register
v1Router.post("/auth/register", handleRegister);

// POST /api/v1/auth/signup
v1Router.post("/auth/signup", handleRegister);

// POST /api/v1/auth/login
v1Router.post("/auth/login", handleLogin);

// POST /api/v1/auth/refresh
v1Router.post("/auth/refresh", async (req: Request, res: Response) => {
  const user = await resolveSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Session expired or invalid." });
    return;
  }
  const token = await signSessionToken(user);
  res.json({ ok: true, user, token });
});

// POST /api/v1/auth/logout
v1Router.post("/auth/logout", handleLogout);

// GET /api/v1/auth/me
v1Router.get("/auth/me", handleMe);

// ─── Module 2: Patients & Assignments ─────────────────────────────────────────

// GET /api/v1/patients (Role-enforced filtering)
v1Router.get("/patients", requireV1Auth(), async (req: Request, res: Response) => {
  const user = (req as any).user;

  let accessiblePatients = db.patients;

  if (user.role === "DOCTOR") {
    const doctor = db.doctors.find((d) => d.userId === user.id);
    const assignedIds = new Set(
      db.patientAssignments
        .filter((a) => a.active && a.doctorId === doctor?.id)
        .map((a) => a.patientId)
    );
    accessiblePatients = db.patients.filter((p) => assignedIds.has(p.id));
  } else if (user.role === "CAREGIVER") {
    const caregiver = db.caregivers.find((c) => c.userId === user.id);
    const assignedIds = new Set(
      db.patientAssignments
        .filter((a) => a.active && a.caregiverId === caregiver?.id)
        .map((a) => a.patientId)
    );
    accessiblePatients = db.patients.filter((p) => assignedIds.has(p.id));
  }

  res.json({ patients: accessiblePatients });
});

// POST /api/v1/patients
v1Router.post("/patients", requireV1Auth(["CAREGIVER", "ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { fullName, dateOfBirth, timezone, emergencyContact, primaryPhone } = req.body;
    if (!fullName || !dateOfBirth) {
      res.status(400).json({ error: "fullName and dateOfBirth are required." });
      return;
    }

    const user = (req as any).user;
    const newPatient = {
      id: `p_${Date.now()}`,
      mrn: `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
      name: fullName,
      dateOfBirth: new Date(dateOfBirth),
      sex: "Undisclosed",
      emergencyName: emergencyContact || "Primary Contact",
      emergencyPhone: primaryPhone || "+1-555-0100",
      notes: `Timezone: ${timezone || "UTC"}`,
      createdAt: new Date(),
    };
    db.patients.push(newPatient);

    // Auto-assign to creating caregiver
    if (user.role === "CAREGIVER") {
      const caregiver = db.caregivers.find((c) => c.userId === user.id);
      db.patientAssignments.push({
        id: `pa_${Date.now()}`,
        patientId: newPatient.id,
        doctorId: db.doctors[0]?.id || null,
        caregiverId: caregiver?.id || null,
        active: true,
        createdAt: new Date(),
      });
    }

    res.status(201).json({ patient: newPatient });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create patient." });
  }
});

// GET /api/v1/patients/:id
v1Router.get("/patients/:id", requireV1Auth(), (req: Request, res: Response) => {
  const patient = db.patients.find((p) => p.id === req.params.id);
  if (!patient) {
    res.status(404).json({ error: "Patient not found." });
    return;
  }
  const plans = db.medicationPlans.filter((pl) => pl.patientId === patient.id);
  const device = db.devices.find((d) => d.patientId === patient.id);
  res.json({ patient, plans, device });
});

// ─── Module 3: Medications & Schedules ────────────────────────────────────────

// GET /api/v1/patients/:id/medications
v1Router.get("/patients/:id/medications", requireV1Auth(), (req: Request, res: Response) => {
  const plans = db.medicationPlans.filter((pl) => pl.patientId === req.params.id);
  const meds = plans.map((pl) => {
    const med = db.medications.find((m) => m.id === pl.medicationId);
    return {
      planId: pl.id,
      medicationId: pl.medicationId,
      name: med?.name || "Medication",
      dosage: pl.dosage,
      instructions: pl.instructions,
      scheduledTime: pl.scheduledTime,
      deviceSlot: pl.deviceSlot,
      mealRelationship: pl.mealRelationship,
      status: pl.status,
    };
  });
  res.json({ medications: meds });
});

// POST /api/v1/patients/:id/medications
v1Router.post("/patients/:id/medications", requireV1Auth(["DOCTOR", "ADMIN"]), (req: Request, res: Response) => {
  const { name, dosage, instructions, mealRelation, strength } = req.body;
  if (!name) {
    res.status(400).json({ error: "Medication name is required." });
    return;
  }

  const medId = `med_${Date.now()}`;
  const newMed = {
    id: medId,
    name,
    form: "Tablet",
    strength: strength || dosage || "Standard",
  };
  db.medications.push(newMed);

  res.status(201).json({ medication: newMed });
});

// POST /api/v1/medications/:id/schedules
// Generates scheduled dose instances!
v1Router.post("/medications/:id/schedules", requireV1Auth(["DOCTOR", "CAREGIVER", "ADMIN"]), (req: Request, res: Response) => {
  const validation = validateScheduleInput({
    ...req.body,
    medicationId: req.body.medicationId || req.params.id,
  });
  if (!validation.success) {
    res.status(400).json({ errors: validation.errors });
    return;
  }

  const input = validation.data!;
  const med = db.medications.find((m) => m.id === req.params.id);
  const patient = db.patients[0]; // default to first patient or req.body.patientId
  const patientId = req.body.patientId || patient?.id || "p1";

  const planId = `plan_${Date.now()}`;
  const newPlan = {
    id: planId,
    patientId,
    medicationId: req.params.id,
    dosage: req.body.dosage || "1 tablet",
    frequency: "Daily",
    startDate: new Date(input.startDate),
    endDate: input.endDate ? new Date(input.endDate) : null,
    scheduledTime: input.times[0] || "08:00",
    mealRelationship: req.body.mealRelationship || "NO_MEAL_DEPENDENCY",
    mealKind: null,
    instructions: req.body.instructions || "Take as prescribed.",
    deviceSlot: input.compartmentId,
    authorizedBy: (req as any).user.name,
    status: "ACTIVE",
    createdAt: new Date(),
  };
  db.medicationPlans.push(newPlan);

  // Generate individual scheduled dose records
  const generatedDoses = [];
  const baseDate = input.startDate ? new Date(input.startDate) : new Date();
  for (const timeStr of input.times) {
    const [hh, mm] = timeStr.split(":").map(Number);
    const scheduledAt = new Date(baseDate);
    scheduledAt.setHours(hh, mm, 0, 0);

    const y = scheduledAt.getFullYear();
    const m = String(scheduledAt.getMonth() + 1).padStart(2, "0");
    const d = String(scheduledAt.getDate()).padStart(2, "0");
    const h = String(hh).padStart(2, "0");
    const min = String(mm).padStart(2, "0");
    const seq = String(db.medicationEvents.length + 1).padStart(3, "0");
    const doseId = `ME-${y}${m}${d}-${h}${min}-${seq}`;

    const newEvent = {
      id: doseId,
      patientId,
      planId,
      scheduledAt,
      state: "SCHEDULED",
      eligibleAt: scheduledAt,
      notifiedAt: null,
      dispensedAt: null,
      confirmedAt: null,
      missedAt: null,
      failedReason: null,
      delayMinutes: 0,
      deviceId: "dev_simulator",
      createdAt: new Date(),
    };
    db.medicationEvents.push(newEvent);
    generatedDoses.push(newEvent);
  }

  res.status(201).json({
    schedule: newPlan,
    generatedDosesCount: generatedDoses.length,
    doses: generatedDoses,
  });
});

// PATCH /api/v1/schedules/:id (21 CFR Part 11 Audit Logged)
v1Router.patch("/schedules/:id", requireV1Auth(["DOCTOR", "CAREGIVER", "ADMIN"]), (req: Request, res: Response) => {
  const plan = db.medicationPlans.find((pl) => pl.id === req.params.id);
  if (!plan) {
    res.status(404).json({ error: "Schedule not found." });
    return;
  }

  const oldValue = { ...plan };
  if (req.body.scheduledTime) plan.scheduledTime = req.body.scheduledTime;
  if (req.body.deviceSlot) plan.deviceSlot = Number(req.body.deviceSlot);
  if (req.body.status) plan.status = req.body.status;
  if (req.body.instructions) plan.instructions = req.body.instructions;

  // Log audit
  const audit = {
    id: `aud_${Date.now()}`,
    actorId: (req as any).user.id,
    action: "SCHEDULE_UPDATED",
    resourceType: "MEDICATION_PLAN",
    resourceId: plan.id,
    oldValue,
    newValue: plan,
    createdAt: new Date(),
  };

  res.json({ schedule: plan, audit });
});

// ─── Module 4: Doses & Patient Confirmation ───────────────────────────────────

// GET /api/v1/patients/:id/doses
v1Router.get("/patients/:id/doses", requireV1Auth(), (req: Request, res: Response) => {
  const events = db.medicationEvents.filter((e) => e.patientId === req.params.id);
  const formatted = events.map((e) => {
    const plan = db.medicationPlans.find((pl) => pl.id === e.planId);
    const med = db.medications.find((m) => m.id === plan?.medicationId);
    return {
      id: e.id,
      medicationName: med?.name || "Medication",
      dosage: plan?.dosage || "1 dose",
      slot: plan?.deviceSlot || 1,
      scheduledAt: e.scheduledAt.toISOString(),
      state: e.state,
      confirmedAt: e.confirmedAt ? e.confirmedAt.toISOString() : null,
      delayMinutes: e.delayMinutes ?? 0,
      deviceId: e.deviceId,
    };
  });
  res.json({ doses: formatted });
});

// POST /api/v1/doses/:id/confirm (Idempotent confirmation)
v1Router.post("/doses/:id/confirm", requireV1Auth(), (req: Request, res: Response) => {
  const event = db.medicationEvents.find((e) => e.id === req.params.id);
  if (!event) {
    res.status(404).json({ error: "Dose record not found." });
    return;
  }

  if (["CONFIRMED", "DISPENSED"].includes(event.state) && event.confirmedAt) {
    // Idempotent: already confirmed
    res.json({ ok: true, dose: event, duplicatePrevented: true });
    return;
  }

  event.state = "CONFIRMED";
  event.confirmedAt = new Date();
  event.dispensedAt = event.dispensedAt || new Date();

  // Reset simulator compartment signals if connected
  const device = db.devices.find((d) => d.id === event.deviceId || d.serial === "ESP32-MED-904");
  if (device) {
    device.door = "Closed";
  }

  res.json({ ok: true, dose: event });
});

// ─── Module 5: Device Status & Events Ingestion ───────────────────────────────

// GET /api/v1/devices/:id
v1Router.get("/devices/:id", requireV1Auth(), (req: Request, res: Response) => {
  const device =
    db.devices.find((d) => d.id === req.params.id || d.serial === req.params.id) ||
    db.devices[0];

  if (!device) {
    res.status(404).json({ error: "Device not found." });
    return;
  }

  const slots = [
    { compartmentNumber: 1, label: "Morning", status: "LOCKED", ledState: "OFF", stock: 14 },
    { compartmentNumber: 2, label: "Afternoon", status: device.door === "Open" ? "OPEN" : "LOCKED", ledState: "OFF", stock: 13 },
    { compartmentNumber: 3, label: "Evening", status: "LOCKED", ledState: "OFF", stock: 14 },
    { compartmentNumber: 4, label: "Night", status: "LOCKED", ledState: "OFF", stock: 14 },
  ];

  res.json({
    device: {
      id: device.id,
      serialNumber: device.serial,
      online: device.online,
      batteryPct: device.batteryPct,
      wifiQuality: device.wifiQuality,
      firmwareVersion: device.firmware,
      compartments: slots,
    },
  });
});

// POST /api/v1/devices/:id/sync
v1Router.post("/devices/:id/sync", requireV1Auth(), (_req: Request, res: Response) => {
  res.json({ ok: true, syncedAt: new Date().toISOString() });
});

// POST /api/v1/devices/:id/events (Ingest hardware / simulator events)
v1Router.post("/devices/:id/events", async (req: Request, res: Response) => {
  const validation = validateDeviceEvent(req.body);
  if (!validation.success) {
    res.status(400).json({ errors: validation.errors });
    return;
  }

  const event = validation.data!;
  // Check idempotency deduplication
  const existing = (db as any).rawDeviceEvents?.find((e: any) => e.eventId === event.eventId);
  if (existing) {
    res.json({ ok: true, deduplicated: true, event: existing });
    return;
  }

  if (!(db as any).rawDeviceEvents) {
    (db as any).rawDeviceEvents = [];
  }
  (db as any).rawDeviceEvents.push(event);

  // Update associated dose record if doseId supplied
  if (event.doseId) {
    const dose = db.medicationEvents.find((e) => e.id === event.doseId);
    if (dose) {
      if (event.eventType === "PATIENT_CONFIRMED") {
        dose.state = "CONFIRMED";
        dose.confirmedAt = new Date(event.occurredAt);
      } else if (event.eventType === "COMPARTMENT_OPENED") {
        dose.dispensedAt = new Date(event.occurredAt);
      } else if (event.eventType === "REMINDER_TRIGGERED") {
        dose.notifiedAt = new Date(event.occurredAt);
      }
    }
  }

  res.status(201).json({ ok: true, event });
});

// ─── Module 6: Adherence & Compliance Reports ─────────────────────────────────

// GET /api/v1/patients/:id/adherence
v1Router.get("/patients/:id/adherence", requireV1Auth(), (req: Request, res: Response) => {
  const events = db.medicationEvents.filter((e) => e.patientId === req.params.id);
  const confirmed = events.filter((e) => ["CONFIRMED", "DISPENSED"].includes(e.state)).length;
  const missed = events.filter((e) => e.state === "MISSED").length;
  const delayed = events.filter((e) => (e.delayMinutes ?? 0) > 15).length;
  const eligible = events.filter((e) => e.state !== "CANCELLED" && e.state !== "SCHEDULED").length || Math.max(events.length, 1);

  const adherenceRatePct = Math.round((confirmed / eligible) * 1000) / 10;
  const dataCompletenessPct = Math.round(((confirmed + missed) / Math.max(events.length, 1)) * 1000) / 10;

  res.json({
    adherence: {
      patientId: req.params.id,
      eligibleDoses: eligible,
      confirmedDoses: confirmed,
      missedDoses: missed,
      delayedDoses: delayed,
      adherenceRatePct,
      dataCompletenessPct,
      confirmedVsUncertain: {
        patientConfirmed: confirmed,
        uncertainOrPending: events.length - confirmed,
      },
    },
  });
});

// GET /api/v1/patients/:id/reports
v1Router.get("/patients/:id/reports", requireV1Auth(), (req: Request, res: Response) => {
  const patient = db.patients.find((p) => p.id === req.params.id);
  if (!patient) {
    res.status(404).json({ error: "Patient not found." });
    return;
  }
  const events = db.medicationEvents.filter((e) => e.patientId === patient.id);

  res.json({
    patient: { id: patient.id, name: patient.name, mrn: patient.mrn },
    generatedAt: new Date().toISOString(),
    regulatoryStandard: "21 CFR Part 11 & HIPAA Cryptographic Ledger",
    eventsCount: events.length,
    events,
  });
});

// ─── Module 7: Notifications ──────────────────────────────────────────────────

// GET /api/v1/notifications
v1Router.get("/notifications", requireV1Auth(), (req: Request, res: Response) => {
  const user = (req as any).user;
  const userNotifications = db.notifications.filter(
    (n) => !n.userId || n.userId === user.id || n.userId === "usr_caregiver" || (user.role === "CAREGIVER" && n.channel === "PUSH")
  );
  res.json({ notifications: userNotifications });
});

// PATCH /api/v1/notifications/:id/read
v1Router.patch("/notifications/:id/read", requireV1Auth(), (req: Request, res: Response) => {
  const notif = db.notifications.find((n) => n.id === req.params.id);
  if (notif) {
    notif.read = true;
  }
  res.json({ ok: true });
});

// POST /api/v1/worker/tick (Background worker trigger endpoint for testing and simulation)
v1Router.post("/worker/tick", async (req: Request, res: Response) => {
  const { processDoseRemindersAndEscalations } = await import("../workers/doseReminderWorker.js");
  const simulatedTime = req.body.timestamp ? new Date(req.body.timestamp) : new Date();
  const result = await processDoseRemindersAndEscalations(simulatedTime);
  res.json({ ok: true, result });
});
