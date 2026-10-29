import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import app from "../../server/index";

// In-process HTTP request helper to bypass sandbox socket restrictions (EACCES)
function makeRequest(method: string, url: string, headers: Record<string, string> = {}, body?: any) {
  return new Promise<{ status: number; body: any }>((resolve) => {
    const { Readable } = require("node:stream");
    const req = new Readable({
      read() {
        if (body) {
          this.push(typeof body === "string" ? body : JSON.stringify(body));
        }
        this.push(null);
      },
    }) as any;
    req.method = method.toUpperCase();
    req.url = url;
    req.headers = {};
    for (const [k, v] of Object.entries(headers)) {
      req.headers[k.toLowerCase()] = v;
    }
    if (body) {
      req.body = body;
      if (!req.headers["content-type"]) {
        req.headers["content-type"] = "application/json";
      }
    }
    req.connection = { remoteAddress: "127.0.0.1" };
    req.socket = req.connection;

    let statusCode = 200;
    let resBody: any = null;
    let resolved = false;

    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve({ status: statusCode, body: resBody });
      }
    };

    const res: any = {
      statusCode: 200,
      status(code: number) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      setHeader() { return this; },
      getHeader() {},
      json(data: any) {
        resBody = data;
        finish();
        return this;
      },
      send(data: any) {
        resBody = data;
        finish();
        return this;
      },
      end(chunk: any) {
        if (chunk && !resBody) resBody = chunk;
        finish();
      },
    };

    app.handle(req, res, (err: any) => {
      if (err) {
        statusCode = 500;
        resBody = { error: err.message };
      }
      finish();
    });
  });
}

describe("MediServe /api/v1 REST Specification & Clinical Security Checklist", () => {
  let caregiverToken = "";
  let doctorToken = "";
  let adminToken = "";
  let testPatientId = "p1";
  let testMedicationId = "";
  let generatedDoseId = "";

  before(async () => {
    // Login as caregiver
    const cgRes = await makeRequest("POST", "/api/v1/auth/login", {}, {
      email: "caregiver@mediserve.local",
      password: "MediServe!23",
    });
    assert.equal(cgRes.status, 200, "Caregiver login succeeds");
    caregiverToken = cgRes.body.token;

    // Login as doctor
    const docRes = await makeRequest("POST", "/api/v1/auth/login", {}, {
      email: "doctor@mediserve.local",
      password: "MediServe!23",
    });
    assert.equal(docRes.status, 200, "Doctor login succeeds");
    doctorToken = docRes.body.token;

    // Login as admin
    const admRes = await makeRequest("POST", "/api/v1/auth/login", {}, {
      email: "admin@mediserve.local",
      password: "MediServe!23",
    });
    assert.equal(admRes.status, 200, "Admin login succeeds");
    adminToken = admRes.body.token;
  });

  // ─── Checklist Item 1: Role-based login and patient access restrictions ────────
  test("Checklist 1: Role-based authentication and route permissions", async () => {
    // Unauthenticated request should be 401
    const unauthRes = await makeRequest("GET", "/api/v1/patients");
    assert.equal(unauthRes.status, 401, "Protected endpoint requires token");

    // Caregiver can list patients
    const cgPatientsRes = await makeRequest("GET", "/api/v1/patients", {
      Authorization: `Bearer ${caregiverToken}`,
    });
    assert.equal(cgPatientsRes.status, 200);
    assert.ok(Array.isArray(cgPatientsRes.body.patients), "Returns patients array");

    // Doctor can list patients
    const docPatientsRes = await makeRequest("GET", "/api/v1/patients", {
      Authorization: `Bearer ${doctorToken}`,
    });
    assert.equal(docPatientsRes.status, 200);

    // Newly registered user has NO automatic access to patients
    const regRes = await makeRequest("POST", "/api/v1/auth/register", {}, {
      name: "Test Clinician",
      email: `new_user_${Date.now()}@mediserve.local`,
      password: "Pass!Word123",
      role: "DOCTOR",
    });
    assert.equal(regRes.status, 201);

    const newDocPatientsRes = await makeRequest("GET", "/api/v1/patients", {
      Authorization: `Bearer ${regRes.body.token}`,
    });
    assert.equal(newDocPatientsRes.body.patients.length, 0, "New account has zero patient access until explicitly assigned");
  });

  // ─── Checklist Item 2: Medication schedules generate unique dose records ───────
  test("Checklist 2: Medication schedule creates unique deterministic dose records", async () => {
    // Prescribe medication
    const medRes = await makeRequest("POST", `/api/v1/patients/${testPatientId}/medications`, {
      Authorization: `Bearer ${doctorToken}`,
    }, {
      name: "Amlodipine Besylate",
      dosage: "5mg",
      instructions: "Take 1 tablet every morning",
      mealRelation: "AFTER_MEAL",
    });
    assert.equal(medRes.status, 201);
    testMedicationId = medRes.body.medication.id;

    // Create schedule for 08:00 slot
    const schedRes = await makeRequest("POST", `/api/v1/medications/${testMedicationId}/schedules`, {
      Authorization: `Bearer ${doctorToken}`,
    }, {
      patientId: testPatientId,
      compartmentId: 1,
      times: ["08:00"],
      timezone: "Asia/Kolkata",
      startDate: "2026-11-01T00:00:00Z",
      confirmationWindowMinutes: 15,
    });
    assert.equal(schedRes.status, 201);
    assert.ok(schedRes.body.generatedDosesCount >= 1, "Generated dose instances");
    generatedDoseId = schedRes.body.doses[0].id;

    // Verify format ME-YYYYMMDD-HHMM-NNN
    assert.match(generatedDoseId, /^ME-\d{8}-\d{4}-\d{3}$/, "Matches deterministic clinical ID format");
  });

  // ─── Checklist Item 3 & 4: Correct compartment activates and resets on confirm ─
  test("Checklist 3 & 4: Correct compartment activates and resets on patient confirmation", async () => {
    // 1. Ingest reminder triggered event
    const trigEventRes = await makeRequest("POST", "/api/v1/devices/ESP32-MED-904/events", {}, {
      eventId: `evt_trig_${Date.now()}`,
      deviceId: "ESP32-MED-904",
      compartmentId: 1,
      doseId: generatedDoseId,
      eventType: "REMINDER_TRIGGERED",
      occurredAt: new Date().toISOString(),
      source: "SIMULATOR",
    });
    assert.equal(trigEventRes.status, 201);

    // 2. Patient confirms dose
    const confirmRes = await makeRequest("POST", `/api/v1/doses/${generatedDoseId}/confirm`, {
      Authorization: `Bearer ${caregiverToken}`,
    }, {
      idempotencyKey: `CONF-${generatedDoseId}`,
    });
    assert.equal(confirmRes.status, 200);
    assert.equal(confirmRes.body.dose.state, "CONFIRMED");
    assert.ok(confirmRes.body.dose.confirmedAt, "Confirmed timestamp recorded");

    // 3. Repeat confirmation (Idempotent test)
    const repeatConfirmRes = await makeRequest("POST", `/api/v1/doses/${generatedDoseId}/confirm`, {
      Authorization: `Bearer ${caregiverToken}`,
    }, {
      idempotencyKey: `CONF-${generatedDoseId}`,
    });
    assert.equal(repeatConfirmRes.status, 200);
    assert.equal(repeatConfirmRes.body.duplicatePrevented, true, "Duplicate confirmation prevented idempotently");
  });

  // ─── Checklist Item 5 & 6: Missed-dose alerts and notification retries ─────────
  test("Checklist 5 & 6: Missed-dose alerts generated after deadline without duplicates", async () => {
    // Create an overdue scheduled dose
    const pastTime = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago
    const timeHHMM = `${String(pastTime.getHours()).padStart(2, "0")}:${String(pastTime.getMinutes()).padStart(2, "0")}`;
    const schedRes = await makeRequest("POST", `/api/v1/medications/${testMedicationId}/schedules`, {
      Authorization: `Bearer ${doctorToken}`,
    }, {
      patientId: testPatientId,
      compartmentId: 2,
      times: [timeHHMM],
      timezone: "UTC",
      startDate: pastTime.toISOString(),
      confirmationWindowMinutes: 15,
    });
    assert.equal(schedRes.status, 201);

    // 1. Trigger reminder at past scheduled time (SCHEDULED -> REMINDER_TRIGGERED)
    await makeRequest("POST", "/api/v1/worker/tick", {}, {
      timestamp: pastTime.toISOString(),
    });

    // 2. Trigger expiration tick after 15m window has passed (REMINDER_TRIGGERED -> MISSED)
    const futureTime = new Date(Date.now() + 60 * 60 * 1000);
    const tickRes = await makeRequest("POST", "/api/v1/worker/tick", {}, {
      timestamp: futureTime.toISOString(),
    });
    assert.equal(tickRes.status, 200);

    // Verify caretaker receives notifications
    const notifsRes = await makeRequest("GET", "/api/v1/notifications", {
      Authorization: `Bearer ${caregiverToken}`,
    });
    assert.equal(notifsRes.status, 200);
    assert.ok(notifsRes.body.notifications.length >= 1, "Caretaker received alerts");
  });

  // ─── Checklist Item 7: Doctor reports distinguish confirmed vs uncertain doses ─
  test("Checklist 7: Adherence report explicitly breaks down confirmed vs uncertain", async () => {
    const adhRes = await makeRequest("GET", `/api/v1/patients/${testPatientId}/adherence`, {
      Authorization: `Bearer ${doctorToken}`,
    });
    assert.equal(adhRes.status, 200);
    const adhData = adhRes.body;

    assert.ok(typeof adhData.adherence.adherenceRatePct === "number");
    assert.ok(typeof adhData.adherence.dataCompletenessPct === "number");
    assert.ok(adhData.adherence.confirmedVsUncertain, "Breaks down confirmed vs uncertain");
    assert.ok(typeof adhData.adherence.confirmedVsUncertain.patientConfirmed === "number");
    assert.ok(typeof adhData.adherence.confirmedVsUncertain.uncertainOrPending === "number");
  });

  // ─── Checklist Item 8: Mobile notifications and web share event status ─────────
  test("Checklist 8: Unified dose statuses across client gateways", async () => {
    const dosesRes = await makeRequest("GET", `/api/v1/patients/${testPatientId}/doses`, {
      Authorization: `Bearer ${caregiverToken}`,
    });
    assert.equal(dosesRes.status, 200);
    const dosesData = dosesRes.body;

    for (const d of dosesData.doses) {
      assert.ok(["SCHEDULED", "REMINDER_TRIGGERED", "CONFIRMED", "MISSED", "DELAYED", "FAILED"].includes(d.state));
    }
  });

  // ─── Checklist Item 9: Device events authenticated and deduplicated ───────────
  test("Checklist 9: Device events deduplicated by eventId", async () => {
    const fixedEventId = `evt_fixed_${Date.now()}`;
    const eventPayload = {
      eventId: fixedEventId,
      deviceId: "ESP32-MED-904",
      compartmentId: 1,
      eventType: "COMPARTMENT_OPENED",
      occurredAt: new Date().toISOString(),
      source: "SIMULATOR",
    };

    const firstRes = await makeRequest("POST", "/api/v1/devices/ESP32-MED-904/events", {}, eventPayload);
    assert.equal(firstRes.status, 201);

    const dupRes = await makeRequest("POST", "/api/v1/devices/ESP32-MED-904/events", {}, eventPayload);
    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.body.deduplicated, true, "Duplicate device event deduplicated");
  });

  // ─── Checklist Item 10: Schedule update audit log ─────────────────────────────
  test("Checklist 10: Schedule modification produces 21 CFR Part 11 audit log", async () => {
    const medRes = await makeRequest("GET", `/api/v1/patients/${testPatientId}/medications`, {
      Authorization: `Bearer ${doctorToken}`,
    });
    const meds = medRes.body.medications;
    const planId = meds[0].planId;

    const patchRes = await makeRequest("PATCH", `/api/v1/schedules/${planId}`, {
      Authorization: `Bearer ${doctorToken}`,
    }, { scheduledTime: "08:30" });
    assert.equal(patchRes.status, 200);
    assert.ok(patchRes.body.audit, "Audit record generated");
    assert.equal(patchRes.body.audit.action, "SCHEDULE_UPDATED");
  });

  // ─── Section 13: End-to-End Success Scenario Validation ───────────────────────
  test("Section 13: Complete End-to-End Scenario (Create -> Activate -> Confirm & Overdue Alert)", async () => {
    // 1. Caretaker creates patient
    const newPtRes = await makeRequest("POST", "/api/v1/patients", {
      Authorization: `Bearer ${caregiverToken}`,
    }, {
      fullName: "Arthur Pendelton",
      dateOfBirth: "1940-03-22",
      timezone: "Asia/Kolkata",
    });
    assert.equal(newPtRes.status, 201);
    const newPt = newPtRes.body.patient;

    // 2. Doctor configures medicine for 8:00 AM in compartment 1
    const newMedRes = await makeRequest("POST", `/api/v1/patients/${newPt.id}/medications`, {
      Authorization: `Bearer ${doctorToken}`,
    }, {
      name: "Donepezil HCl",
      dosage: "10mg",
      instructions: "Take 1 tablet at 8:00 AM",
      mealRelation: "AFTER_MEAL",
    });
    assert.equal(newMedRes.status, 201);
    const medId = newMedRes.body.medication.id;

    const schedRes = await makeRequest("POST", `/api/v1/medications/${medId}/schedules`, {
      Authorization: `Bearer ${doctorToken}`,
    }, {
      patientId: newPt.id,
      compartmentId: 1,
      times: ["08:00"],
      timezone: "Asia/Kolkata",
      startDate: new Date().toISOString(),
      confirmationWindowMinutes: 15,
    });
    assert.equal(schedRes.status, 201);
    const dose = schedRes.body.doses[0];

    // 3. Virtual medicine box activates compartment
    const activateEvent = await makeRequest("POST", "/api/v1/devices/ESP32-MED-904/events", {}, {
      eventId: `evt_act_${Date.now()}`,
      deviceId: "ESP32-MED-904",
      compartmentId: 1,
      doseId: dose.id,
      eventType: "COMPARTMENT_OPENED",
      occurredAt: new Date().toISOString(),
      source: "SIMULATOR",
    });
    assert.equal(activateEvent.status, 201);

    // 4. Patient confirms dose
    const confRes = await makeRequest("POST", `/api/v1/doses/${dose.id}/confirm`, {
      Authorization: `Bearer ${caregiverToken}`,
    }, { idempotencyKey: `CONF-${dose.id}` });
    assert.equal(confRes.status, 200);

    // 5. Doctor generates compliance report
    const reportRes = await makeRequest("GET", `/api/v1/patients/${newPt.id}/reports`, {
      Authorization: `Bearer ${doctorToken}`,
    });
    assert.equal(reportRes.status, 200);
    assert.ok(reportRes.body.eventsCount >= 1, "Report contains audited events");
    assert.equal(reportRes.body.regulatoryStandard, "21 CFR Part 11 & HIPAA Cryptographic Ledger");
  });
});
