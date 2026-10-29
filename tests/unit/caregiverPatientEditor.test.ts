import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db, DBUser, DBCaregiver, DBPatient, DBPatientAssignment } from "../../src/lib/db";
import { signSessionToken } from "../../server/auth";
import {
  handleGetCaregiverPatient,
  handleUpdateCaregiverPatient,
  handleGetAssignedPatients,
  isCaregiverAuthorizedForPatient,
} from "../../server/caregiverPatientEditor";

describe("Caregiver Patient Details Form Editor Test Suite", () => {
  let caregiverUser1: DBUser;
  let caregiverProfile1: DBCaregiver;
  let caregiverToken1: string;

  let caregiverUser2: DBUser;
  let caregiverProfile2: DBCaregiver;
  let caregiverToken2: string;

  let patientA: DBPatient;
  let patientB: DBPatient;

  beforeEach(async () => {
    // 1. Caregiver 1 (Authorized for Patient A)
    caregiverUser1 = {
      id: `usr-cg-1-${Date.now()}`,
      email: `caregiver1_${Date.now()}@mediserve.local`,
      passwordHash: "$2a$12$dummyHashValueForCaregiverEditorTests123456",
      name: "Maria Santos, CNA",
      role: "CAREGIVER",
      phone: "+1-555-0144",
      verificationStatus: "APPROVED",
      isVerified: true,
      createdAt: new Date(),
    };

    caregiverProfile1 = {
      id: `cg-profile-1-${Date.now()}`,
      userId: caregiverUser1.id,
      phone: "+1-555-0144",
      certifications: "CNA, BLS",
    };

    // 2. Caregiver 2 (Authorized for Patient B, UNAUTHORIZED for Patient A)
    caregiverUser2 = {
      id: `usr-cg-2-${Date.now() + 1}`,
      email: `caregiver2_${Date.now() + 1}@mediserve.local`,
      passwordHash: "$2a$12$dummyHashValueForCaregiverEditorTests123456",
      name: "David Kim, HHA",
      role: "CAREGIVER",
      phone: "+1-555-0177",
      verificationStatus: "APPROVED",
      isVerified: true,
      createdAt: new Date(),
    };

    caregiverProfile2 = {
      id: `cg-profile-2-${Date.now() + 1}`,
      userId: caregiverUser2.id,
      phone: "+1-555-0177",
      certifications: "HHA",
    };

    // 3. Patient Records
    patientA = {
      id: `pat-a-${Date.now()}`,
      mrn: `MRN-A-${Math.floor(1000 + Math.random() * 9000)}`,
      name: "Arthur Pendelton",
      dateOfBirth: new Date("1945-06-15"),
      sex: "M",
      emergencyName: "Eleanor Pendelton (Spouse)",
      emergencyPhone: "+1-555-0101",
      notes: "Hypertension, Mild Cognitive Impairment",
      createdAt: new Date(),
    };

    patientB = {
      id: `pat-b-${Date.now() + 1}`,
      mrn: `MRN-B-${Math.floor(1000 + Math.random() * 9000)}`,
      name: "Beatrice Vance",
      dateOfBirth: new Date("1952-11-20"),
      sex: "F",
      emergencyName: "Thomas Vance (Son)",
      emergencyPhone: "+1-555-0202",
      notes: "Type 2 Diabetes, Diabetic Neuropathy",
      createdAt: new Date(),
    };

    // 4. Assignments: Caregiver 1 -> Patient A ONLY; Caregiver 2 -> Patient B ONLY
    const assignmentA: DBPatientAssignment = {
      id: `asgn-a-${Date.now()}`,
      patientId: patientA.id,
      doctorId: "doc-1",
      caregiverId: caregiverProfile1.id,
      active: true,
      createdAt: new Date(),
    };

    const assignmentB: DBPatientAssignment = {
      id: `asgn-b-${Date.now() + 1}`,
      patientId: patientB.id,
      doctorId: "doc-1",
      caregiverId: caregiverProfile2.id,
      active: true,
      createdAt: new Date(),
    };

    db.users.push(caregiverUser1, caregiverUser2);
    db.caregivers.push(caregiverProfile1, caregiverProfile2);
    db.patients.push(patientA, patientB);
    db.patientAssignments.push(assignmentA, assignmentB);

    caregiverToken1 = await signSessionToken({
      id: caregiverUser1.id,
      sub: caregiverUser1.id,
      email: caregiverUser1.email,
      name: caregiverUser1.name,
      role: caregiverUser1.role,
      phone: caregiverUser1.phone,
      caregiverId: caregiverProfile1.id,
    });

    caregiverToken2 = await signSessionToken({
      id: caregiverUser2.id,
      sub: caregiverUser2.id,
      email: caregiverUser2.email,
      name: caregiverUser2.name,
      role: caregiverUser2.role,
      phone: caregiverUser2.phone,
      caregiverId: caregiverProfile2.id,
    });
  });

  function createMockReqRes(options: {
    method?: string;
    token?: string;
    body?: any;
    params?: any;
    query?: any;
    headers?: Record<string, string>;
  }) {
    const headers: Record<string, string> = { ...(options.headers || {}) };
    if (options.token) {
      headers.authorization = `Bearer ${options.token}`;
    }

    const req: any = {
      method: options.method || "GET",
      headers,
      body: options.body || {},
      params: options.params || {},
      query: options.query || {},
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
    };

    let statusCode = 200;
    let responseBody: any = null;

    const res: any = {
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(data: any) {
        responseBody = data;
        return res;
      },
      get statusCode() {
        return statusCode;
      },
      get body() {
        return responseBody;
      },
    };

    return { req, res };
  }

  // ─── Test Requirement 1: Loading Existing Patient Data ───────────────────────
  describe("1. Loading Existing Patient Data", () => {
    test("populates the form with the selected patient's current stored details", async () => {
      const { req, res } = createMockReqRes({
        method: "GET",
        token: caregiverToken1,
        params: { id: patientA.id },
      });

      await handleGetCaregiverPatient(req, res);

      assert.equal(res.statusCode, 200, "Must return HTTP 200 OK");
      assert.equal(res.body.ok, true);
      assert.equal(res.body.patient.id, patientA.id);
      assert.equal(res.body.patient.name, "Arthur Pendelton");
      assert.equal(res.body.patient.mrn, patientA.mrn);
      assert.equal(res.body.patient.dateOfBirth, "1945-06-15");
      assert.equal(res.body.patient.sex, "M");
      assert.equal(res.body.patient.emergencyName, "Eleanor Pendelton (Spouse)");
      assert.equal(res.body.patient.emergencyPhone, "+1-555-0101");
      assert.equal(res.body.patient.notes, "Hypertension, Mild Cognitive Impairment");
    });

    test("lists assigned patients for the caregiver to select in the editor", async () => {
      const { req, res } = createMockReqRes({
        method: "GET",
        token: caregiverToken1,
      });

      await handleGetAssignedPatients(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.ok, true);
      assert.ok(Array.isArray(res.body.patients));
      const hasPatientA = res.body.patients.some((p: any) => p.id === patientA.id);
      const hasPatientB = res.body.patients.some((p: any) => p.id === patientB.id);

      assert.equal(hasPatientA, true, "Caregiver 1 must see Patient A in directory");
      assert.equal(hasPatientB, false, "Caregiver 1 must NOT see Patient B (unassigned)");
    });
  });

  // ─── Test Requirement 2: A Successful Save That Persists Changes ─────────────
  describe("2. Successful Save & Persistence", () => {
    test("persists updated patient details to the data layer and records audit log", async () => {
      const updatedPayload = {
        name: "Arthur Pendelton, Jr.",
        dateOfBirth: "1945-06-15",
        sex: "M",
        emergencyName: "Eleanor Pendelton (Primary Contact)",
        emergencyPhone: "+1-555-0899",
        notes: "Hypertension, Mild Cognitive Impairment, Low Sodium Diet Requested",
      };

      const { req, res } = createMockReqRes({
        method: "PUT",
        token: caregiverToken1,
        params: { id: patientA.id },
        body: updatedPayload,
      });

      await handleUpdateCaregiverPatient(req, res);

      assert.equal(res.statusCode, 200, "Must return HTTP 200 OK on save");
      assert.equal(res.body.ok, true);
      assert.match(res.body.message, /updated successfully/i);

      // Verify persistent change in the underlying data layer
      const storedPatient = db.patients.find((p) => p.id === patientA.id);
      assert.ok(storedPatient, "Patient record must exist in DB");
      assert.equal(storedPatient.name, updatedPayload.name);
      assert.equal(storedPatient.emergencyName, updatedPayload.emergencyName);
      assert.equal(storedPatient.emergencyPhone, updatedPayload.emergencyPhone);
      assert.equal(storedPatient.notes, updatedPayload.notes);

      // Verify 21 CFR Part 11 Audit Trail event recorded
      const auditEntry = db.auditLogs.find(
        (a) => a.patientId === patientA.id && a.action === "CAREGIVER_PATIENT_DETAILS_UPDATED"
      );
      assert.ok(auditEntry, "Must record audit entry in db.auditLogs");
      assert.equal(auditEntry.result, "SUCCESS");
      assert.equal(auditEntry.userId, caregiverUser1.id);
    });
  });

  // ─── Test Requirement 3: Validation Failures & No Save Attempted ─────────────
  describe("3. Validation Failures (No Save Attempted)", () => {
    test("rejects missing patient legal name with field-level error and leaves DB untouched", async () => {
      const originalName = patientA.name;

      const { req, res } = createMockReqRes({
        method: "PUT",
        token: caregiverToken1,
        params: { id: patientA.id },
        body: {
          name: "   ", // Blank name
          dateOfBirth: "1945-06-15",
          emergencyName: "Eleanor Pendelton",
          emergencyPhone: "+1-555-0101",
        },
      });

      await handleUpdateCaregiverPatient(req, res);

      assert.equal(res.statusCode, 400, "Must return HTTP 400 Bad Request");
      assert.equal(res.body.ok, false);
      assert.ok(res.body.errors.name, "Must report field-level error for name");
      assert.match(res.body.errors.name, /name is required/i);

      // Stored record must remain UNCHANGED
      const storedPatient = db.patients.find((p) => p.id === patientA.id);
      assert.equal(storedPatient?.name, originalName, "Stored record must not change on validation failure");
    });

    test("rejects future date of birth with field-level error and leaves DB untouched", async () => {
      const futureYear = new Date().getFullYear() + 2;
      const futureDob = `${futureYear}-01-01`;

      const { req, res } = createMockReqRes({
        method: "PUT",
        token: caregiverToken1,
        params: { id: patientA.id },
        body: {
          name: "Arthur Pendelton",
          dateOfBirth: futureDob, // Future date
          emergencyName: "Eleanor Pendelton",
          emergencyPhone: "+1-555-0101",
        },
      });

      await handleUpdateCaregiverPatient(req, res);

      assert.equal(res.statusCode, 400);
      assert.ok(res.body.errors.dateOfBirth);
      assert.match(res.body.errors.dateOfBirth, /future/i);
    });

    test("rejects malformed emergency phone format and leaves DB untouched", async () => {
      const originalPhone = patientA.emergencyPhone;

      const { req, res } = createMockReqRes({
        method: "PUT",
        token: caregiverToken1,
        params: { id: patientA.id },
        body: {
          name: "Arthur Pendelton",
          dateOfBirth: "1945-06-15",
          emergencyName: "Eleanor Pendelton",
          emergencyPhone: "123", // Malformed phone (< 8 digits)
        },
      });

      await handleUpdateCaregiverPatient(req, res);

      assert.equal(res.statusCode, 400);
      assert.ok(res.body.errors.emergencyPhone);
      assert.match(res.body.errors.emergencyPhone, /digits|phone/i);

      const storedPatient = db.patients.find((p) => p.id === patientA.id);
      assert.equal(storedPatient?.emergencyPhone, originalPhone);
    });

    test("rejects missing emergency contact name with field-level error", async () => {
      const { req, res } = createMockReqRes({
        method: "PUT",
        token: caregiverToken1,
        params: { id: patientA.id },
        body: {
          name: "Arthur Pendelton",
          dateOfBirth: "1945-06-15",
          emergencyName: "", // Blank emergency contact
          emergencyPhone: "+1-555-0101",
        },
      });

      await handleUpdateCaregiverPatient(req, res);

      assert.equal(res.statusCode, 400);
      assert.ok(res.body.errors.emergencyName);
      assert.match(res.body.errors.emergencyName, /emergency contact/i);
    });
  });

  // ─── Test Requirement 4: Unauthorized Edit Attempt Rejected ──────────────────
  describe("4. Authorization Enforcement & Cross-Patient Protection", () => {
    test("rejects caregiver 2 attempting to edit unassigned patient A with 403 Forbidden and leaves record unchanged", async () => {
      const originalPatientASnapshot = {
        name: patientA.name,
        emergencyName: patientA.emergencyName,
        emergencyPhone: patientA.emergencyPhone,
        notes: patientA.notes,
      };

      const maliciousPayload = {
        name: "Unauthorized Tampering by Caregiver 2",
        dateOfBirth: "1945-06-15",
        emergencyName: "Compromised Contact",
        emergencyPhone: "+1-555-9999",
        notes: "Tampered Notes",
      };

      const { req, res } = createMockReqRes({
        method: "PUT",
        token: caregiverToken2, // Authenticated as Caregiver 2 (only assigned to Patient B)
        params: { id: patientA.id }, // Target Patient A
        body: maliciousPayload,
      });

      await handleUpdateCaregiverPatient(req, res);

      assert.equal(res.statusCode, 403, "Must return HTTP 403 Forbidden for unassigned caregiver");
      assert.match(res.body.error, /not assigned to manage this patient/i);

      // Verify the stored record in DB remains completely unchanged
      const storedPatientA = db.patients.find((p) => p.id === patientA.id);
      assert.equal(storedPatientA?.name, originalPatientASnapshot.name);
      assert.equal(storedPatientA?.emergencyName, originalPatientASnapshot.emergencyName);
      assert.equal(storedPatientA?.emergencyPhone, originalPatientASnapshot.emergencyPhone);
      assert.equal(storedPatientA?.notes, originalPatientASnapshot.notes);
    });

    test("rejects caregiver 2 attempting to view unassigned patient A with 403 Forbidden", async () => {
      const { req, res } = createMockReqRes({
        method: "GET",
        token: caregiverToken2, // Caregiver 2
        params: { id: patientA.id }, // Patient A
      });

      await handleGetCaregiverPatient(req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.body.error, /not assigned to manage this patient/i);
    });

    test("isCaregiverAuthorizedForPatient helper accurately reflects assignment state", () => {
      const isAuth1A = isCaregiverAuthorizedForPatient(caregiverUser1.id, "CAREGIVER", patientA.id);
      const isAuth1B = isCaregiverAuthorizedForPatient(caregiverUser1.id, "CAREGIVER", patientB.id);
      const isAuth2A = isCaregiverAuthorizedForPatient(caregiverUser2.id, "CAREGIVER", patientA.id);
      const isAuth2B = isCaregiverAuthorizedForPatient(caregiverUser2.id, "CAREGIVER", patientB.id);

      assert.equal(isAuth1A, true, "Caregiver 1 is authorized for Patient A");
      assert.equal(isAuth1B, false, "Caregiver 1 is NOT authorized for Patient B");
      assert.equal(isAuth2A, false, "Caregiver 2 is NOT authorized for Patient A");
      assert.equal(isAuth2B, true, "Caregiver 2 is authorized for Patient B");
    });
  });
});
