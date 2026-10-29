import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

import { GET as getAdminData } from "../../src/app/api/admin/data/route";
import { POST as postAdminAssign } from "../../src/app/api/admin/assign/route";
import { GET as getAdminDevices, POST as postAdminDevices } from "../../src/app/api/admin/devices/route";
import { GET as getAdminAudit } from "../../src/app/api/admin/audit/route";
import { GET as getCaregiverDashboard } from "../../src/app/api/caregiver/dashboard/route";
import { GET as getDoctorOverview } from "../../src/app/api/doctor/overview/route";
import { POST as postMeals } from "../../src/app/api/meals/route";
import { POST as postPlans } from "../../src/app/api/plans/route";
import { POST as postNotes } from "../../src/app/api/notes/route";
import { GET as getAlerts } from "../../src/app/api/alerts/route";
import { POST as postAcknowledge } from "../../src/app/api/alerts/acknowledge/route";
import { GET as getReports } from "../../src/app/api/reports/route";
import { GET as getSimulatorData } from "../../src/app/api/simulator/data/route";
import { POST as postSimulatorTick } from "../../src/app/api/simulator/tick/route";
import { POST as postSimulatorState } from "../../src/app/api/simulator/state/route";
import { POST as postSimulatorConfirm } from "../../src/app/api/simulator/confirm/route";

import {
  createClerkSessionToken,
  mapClerkClaimsToUser,
  verifyClerkSession,
} from "../../src/lib/clerk";
import { prisma } from "../../src/lib/db";
import type { SessionUser } from "../../src/lib/auth";

describe("Clerk Server Verification & Security Boundary Tests", () => {
  let caregiverUser: SessionUser;
  let doctorUser: SessionUser;
  let adminUser: SessionUser;

  let caregiverToken: string;
  let doctorToken: string;
  let adminToken: string;

  before(async () => {
    // Look up default seed users
    const cg = await prisma.user.findUnique({
      where: { email: "caregiver@mediserve.local" },
      include: { caregiver: true },
    });
    const doc = await prisma.user.findUnique({
      where: { email: "doctor@mediserve.local" },
      include: { doctor: true },
    });
    const adm = await prisma.user.findUnique({
      where: { email: "admin@mediserve.local" },
    });

    assert.ok(cg, "Caregiver user must exist");
    assert.ok(doc, "Doctor user must exist");
    assert.ok(adm, "Admin user must exist");

    caregiverUser = {
      id: cg.id,
      email: cg.email,
      name: cg.name,
      role: "CAREGIVER",
      caregiverId: cg.caregiver?.id,
    };

    doctorUser = {
      id: doc.id,
      email: doc.email,
      name: doc.name,
      role: "DOCTOR",
      doctorId: doc.doctor?.id,
    };

    adminUser = {
      id: adm.id,
      email: adm.email,
      name: adm.name,
      role: "ADMIN",
    };

    // Generate signed Clerk session tokens for each role
    caregiverToken = await createClerkSessionToken(caregiverUser);
    doctorToken = await createClerkSessionToken(doctorUser);
    adminToken = await createClerkSessionToken(adminUser);
  });

  // ==========================================
  // 1. UNPROTECTED REQUESTS MUST BE REJECTED (401)
  // ==========================================
  describe("Protected endpoints reject requests without a valid Clerk session", () => {
    test("GET /api/admin/data rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/admin/data");
      const res = await getAdminData(req);
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.match(json.error, /Unauthorized/i);
    });

    test("POST /api/admin/assign rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/admin/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: "cm00000010000000000000001" }),
      });
      const res = await postAdminAssign(req);
      assert.equal(res.status, 401);
    });

    test("GET /api/admin/devices rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/admin/devices");
      const res = await getAdminDevices(req);
      assert.equal(res.status, 401);
    });

    test("POST /api/admin/devices rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/admin/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial: "TEST-SERIAL-UNAUTH" }),
      });
      const res = await postAdminDevices(req);
      assert.equal(res.status, 401);
    });

    test("GET /api/admin/audit rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/admin/audit");
      const res = await getAdminAudit(req);
      assert.equal(res.status, 401);
    });

    test("GET /api/caregiver/dashboard rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/caregiver/dashboard");
      const res = await getCaregiverDashboard(req);
      assert.equal(res.status, 401);
    });

    test("POST /api/meals rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: "cm00000010000000000000001",
          kind: "BREAKFAST",
          eventType: "REPORTED",
        }),
      });
      const res = await postMeals(req);
      assert.equal(res.status, 401);
    });

    test("GET /api/doctor/overview rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/doctor/overview");
      const res = await getDoctorOverview(req);
      assert.equal(res.status, 401);
    });

    test("POST /api/plans rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: "cm00000010000000000000001" }),
      });
      const res = await postPlans(req);
      assert.equal(res.status, 401);
    });

    test("POST /api/notes rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: "cm00000010000000000000001", body: "Test" }),
      });
      const res = await postNotes(req);
      assert.equal(res.status, 401);
    });

    test("GET /api/alerts rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/alerts");
      const res = await getAlerts(req);
      assert.equal(res.status, 401);
    });

    test("POST /api/alerts/acknowledge rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/alerts/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: "alert-123" }),
      });
      const res = await postAcknowledge(req);
      assert.equal(res.status, 401);
    });

    test("GET /api/reports rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/reports");
      const res = await getReports(req);
      assert.equal(res.status, 401);
    });

    test("GET /api/simulator/data rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/simulator/data");
      const res = await getSimulatorData(req);
      assert.equal(res.status, 401);
    });

    test("POST /api/simulator/tick rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/simulator/tick", {
        method: "POST",
      });
      const res = await postSimulatorTick(req);
      assert.equal(res.status, 401);
    });

    test("POST /api/simulator/state rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/simulator/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: "dev-1", state: "READY" }),
      });
      const res = await postSimulatorState(req);
      assert.equal(res.status, 401);
    });

    test("POST /api/simulator/confirm rejects unauthenticated requests with 401", async () => {
      const req = new Request("http://localhost/api/simulator/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: "dev-1" }),
      });
      const res = await postSimulatorConfirm(req);
      assert.equal(res.status, 401);
    });
  });

  // ==========================================
  // 2. INVALID / TAMPERED TOKENS MUST BE REJECTED (401)
  // ==========================================
  describe("Endpoints reject invalid and tampered tokens", () => {
    test("rejects malformed token", async () => {
      const req = new Request("http://localhost/api/admin/data", {
        headers: { Authorization: "Bearer malformed.token.value" },
      });
      const res = await getAdminData(req);
      assert.equal(res.status, 401);
    });

    test("rejects tampered token with altered signature", async () => {
      const tampered = caregiverToken.slice(0, -6) + "xxxxxx";
      const req = new Request("http://localhost/api/admin/data", {
        headers: { Authorization: `Bearer ${tampered}` },
      });
      const res = await getAdminData(req);
      assert.equal(res.status, 401);
    });
  });

  // ==========================================
  // 3. ADMIN ENDPOINTS REJECT NON-ADMIN SESSIONS (403)
  // ==========================================
  describe("Admin endpoints reject non-admin sessions with 403 Forbidden", () => {
    test("GET /api/admin/data rejects CAREGIVER session with 403", async () => {
      const req = new Request("http://localhost/api/admin/data", {
        headers: { Authorization: `Bearer ${caregiverToken}` },
      });
      const res = await getAdminData(req);
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.match(json.error, /Forbidden/i);
    });

    test("POST /api/admin/assign rejects CAREGIVER session with 403", async () => {
      const req = new Request("http://localhost/api/admin/assign", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${caregiverToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patientId: "cm00000010000000000000001" }),
      });
      const res = await postAdminAssign(req);
      assert.equal(res.status, 403);
    });

    test("POST /api/admin/devices rejects CAREGIVER session with 403", async () => {
      const req = new Request("http://localhost/api/admin/devices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${caregiverToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ serial: "TEST-DEV-CG" }),
      });
      const res = await postAdminDevices(req);
      assert.equal(res.status, 403);
    });

    test("GET /api/admin/audit rejects CAREGIVER session with 403", async () => {
      const req = new Request("http://localhost/api/admin/audit", {
        headers: { Authorization: `Bearer ${caregiverToken}` },
      });
      const res = await getAdminAudit(req);
      assert.equal(res.status, 403);
    });

    test("GET /api/admin/data rejects DOCTOR session with 403", async () => {
      const req = new Request("http://localhost/api/admin/data", {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      const res = await getAdminData(req);
      assert.equal(res.status, 403);
    });

    test("POST /api/admin/assign rejects DOCTOR session with 403", async () => {
      const req = new Request("http://localhost/api/admin/assign", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${doctorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patientId: "cm00000010000000000000001" }),
      });
      const res = await postAdminAssign(req);
      assert.equal(res.status, 403);
    });

    test("POST /api/admin/devices rejects DOCTOR session with 403", async () => {
      const req = new Request("http://localhost/api/admin/devices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${doctorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ serial: "TEST-DEV-DOC" }),
      });
      const res = await postAdminDevices(req);
      assert.equal(res.status, 403);
    });

    test("GET /api/admin/audit rejects DOCTOR session with 403", async () => {
      const req = new Request("http://localhost/api/admin/audit", {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      const res = await getAdminAudit(req);
      assert.equal(res.status, 403);
    });
  });

  // ==========================================
  // 4. ROLE ISOLATION: CAREGIVER vs DOCTOR
  // ==========================================
  describe("Role isolation boundaries", () => {
    test("POST /api/plans rejects CAREGIVER session with 403 (doctor authorization required)", async () => {
      const req = new Request("http://localhost/api/plans", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${caregiverToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: "cm00000010000000000000001",
          medicine: "Metformin",
          dosage: "500mg",
          frequency: "DAILY",
          scheduledTime: "08:00",
          startDate: "2026-09-16",
        }),
      });
      const res = await postPlans(req);
      assert.equal(res.status, 403);
    });

    test("POST /api/notes rejects CAREGIVER session with 403", async () => {
      const req = new Request("http://localhost/api/notes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${caregiverToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: "cm00000010000000000000001",
          body: "Instruction from caregiver",
        }),
      });
      const res = await postNotes(req);
      assert.equal(res.status, 403);
    });

    test("GET /api/caregiver/dashboard rejects DOCTOR session with 403", async () => {
      const req = new Request("http://localhost/api/caregiver/dashboard", {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      const res = await getCaregiverDashboard(req);
      assert.equal(res.status, 403);
    });

    test("GET /api/doctor/overview rejects CAREGIVER session with 403", async () => {
      const req = new Request("http://localhost/api/doctor/overview", {
        headers: { Authorization: `Bearer ${caregiverToken}` },
      });
      const res = await getDoctorOverview(req);
      assert.equal(res.status, 403);
    });
  });

  // ==========================================
  // 5. VALID CLERK SESSIONS ARE ACCEPTED (200)
  // ==========================================
  describe("Valid Clerk sessions succeed and map to real database entities", () => {
    test("Caregiver Clerk session successfully loads caregiver dashboard", async () => {
      const req = new Request("http://localhost/api/caregiver/dashboard", {
        headers: { Authorization: `Bearer ${caregiverToken}` },
      });
      const res = await getCaregiverDashboard(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.patients));
      assert.ok(data.totals);
    });

    test("Doctor Clerk session successfully loads doctor overview", async () => {
      const req = new Request("http://localhost/api/doctor/overview", {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      const res = await getDoctorOverview(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.rows));
    });

    test("Admin Clerk session successfully accesses all admin endpoints", async () => {
      // 1. GET /api/admin/data
      const dataReq = new Request("http://localhost/api/admin/data", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const dataRes = await getAdminData(dataReq);
      assert.equal(dataRes.status, 200);
      const data = await dataRes.json();
      assert.ok(Array.isArray(data.patients));
      assert.ok(Array.isArray(data.devices));

      // 2. GET /api/admin/devices
      const devReq = new Request("http://localhost/api/admin/devices", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const devRes = await getAdminDevices(devReq);
      assert.equal(devRes.status, 200);

      // 3. GET /api/admin/audit
      const auditReq = new Request("http://localhost/api/admin/audit", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const auditRes = await getAdminAudit(auditReq);
      assert.equal(auditRes.status, 200);

      // 4. POST /api/admin/devices
      const newSerial = `TEST-CLERK-DEV-${Date.now()}`;
      const postDevReq = new Request("http://localhost/api/admin/devices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ serial: newSerial }),
      });
      const postDevRes = await postAdminDevices(postDevReq);
      assert.equal(postDevRes.status, 200);
      const postDevData = await postDevRes.json();
      assert.equal(postDevData.ok, true);
      assert.ok(postDevData.deviceId);
    });
  });

  // ==========================================
  // 6. CLERK IDENTITY MAPPING TESTS
  // ==========================================
  describe("Clerk user identity mapping layer", () => {
    test("maps Clerk claims by email to Prisma caregiver user without changing schema", async () => {
      const user = await mapClerkClaimsToUser({
        sub: "clerk_external_user_id_123",
        email: "caregiver@mediserve.local",
      });
      assert.ok(user);
      assert.equal(user.email, "caregiver@mediserve.local");
      assert.equal(user.role, "CAREGIVER");
      assert.equal(user.name, caregiverUser.name);
      assert.ok(user.caregiverId, "caregiverId must be populated");
    });

    test("maps Clerk claims by email to Prisma doctor user without changing schema", async () => {
      const user = await mapClerkClaimsToUser({
        sub: "clerk_external_doctor_id_456",
        email: "doctor@mediserve.local",
      });
      assert.ok(user);
      assert.equal(user.email, "doctor@mediserve.local");
      assert.equal(user.role, "DOCTOR");
      assert.equal(user.name, doctorUser.name);
      assert.ok(user.doctorId, "doctorId must be populated");
    });

    test("maps Clerk claims by email to Prisma admin user without changing schema", async () => {
      const user = await mapClerkClaimsToUser({
        sub: "clerk_external_admin_id_789",
        email: "admin@mediserve.local",
      });
      assert.ok(user);
      assert.equal(user.email, "admin@mediserve.local");
      assert.equal(user.role, "ADMIN");
      assert.equal(user.name, adminUser.name);
    });

    test("maps Clerk claims by metadata role when sub is an opaque Clerk ID", async () => {
      const adminByRole = await mapClerkClaimsToUser({
        sub: "user_2a98fGkl3jD",
        public_metadata: { role: "ADMIN" },
      });
      assert.ok(adminByRole);
      assert.equal(adminByRole.role, "ADMIN");

      const caregiverByRole = await mapClerkClaimsToUser({
        sub: "user_2a98fGkl3jD_cg",
        public_metadata: { role: "CAREGIVER" },
      });
      assert.ok(caregiverByRole);
      assert.equal(caregiverByRole.role, "CAREGIVER");
    });

    test("rejects invalid Clerk claims that match no user", async () => {
      const invalid = await mapClerkClaimsToUser({
        sub: "user_completely_unknown",
        email: "unknown@example.com",
      });
      assert.equal(invalid, null);
    });
  });
});
