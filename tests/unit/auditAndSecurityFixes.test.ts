import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import app from "../../server/index";
import { db } from "../../src/lib/db";

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

describe("Security and Defect Verification Tests", () => {
  let caregiverToken = "";
  let doctorToken = "";
  let adminToken = "";

  before(async () => {
    const cgRes = await makeRequest("POST", "/api/v1/auth/login", {}, {
      email: "caregiver@mediserve.local",
      password: "MediServe!23",
    });
    caregiverToken = cgRes.body.token;

    const docRes = await makeRequest("POST", "/api/v1/auth/login", {}, {
      email: "doctor@mediserve.local",
      password: "MediServe!23",
    });
    doctorToken = docRes.body.token;

    const admRes = await makeRequest("POST", "/api/v1/auth/login", {}, {
      email: "admin@mediserve.local",
      password: "MediServe!23",
    });
    adminToken = admRes.body.token;
  });

  test("GET /api/v1/patients/:id/reports returns 404 for non-existent patient instead of leaking patient 0", async () => {
    const res = await makeRequest("GET", "/api/v1/patients/non-existent-patient-xyz/reports", {
      Authorization: `Bearer ${doctorToken}`,
    });
    assert.equal(res.status, 404, "Should return 404 Not Found");
    assert.equal(res.body.error, "Patient not found.");
  });

  test("Prescription plan creation generates 21 CFR Part 11 audit log", async () => {
    const initialAuditCount = db.auditLogs.length;
    const planRes = await makeRequest("POST", "/api/plans", {
      Authorization: `Bearer ${doctorToken}`,
    }, {
      patientId: "p1",
      medicine: "Atorvastatin Calcium",
      dosage: "20mg",
      frequency: "Once nightly",
      scheduledTime: "21:00",
      deviceSlot: 4,
    });
    assert.equal(planRes.status, 200);
    assert.equal(db.auditLogs.length, initialAuditCount + 1, "Audit log record must be appended");
    const latestAudit = db.auditLogs[db.auditLogs.length - 1];
    assert.equal(latestAudit.action, "Prescription Plan Created");
    assert.equal(latestAudit.patientId, "p1");
  });

  test("Device telemetry ingestion maps RSSI to wifi quality and records wifiRssi", async () => {
    const device = db.devices[0];
    const res = await makeRequest("POST", "/api/device/telemetry", {}, {
      serial: device.serial,
      batteryPct: 85,
      rssi: -52,
    });
    assert.equal(res.status, 200);
    assert.equal(device.batteryPct, 85);
    assert.equal(device.wifiQuality, "Good");

    const latestTel = db.deviceTelemetries[db.deviceTelemetries.length - 1];
    assert.equal(latestTel.wifiRssi, -52);
  });

  test("Patient profile access is restricted by assignment (CAREGIVER role)", async () => {
    // Create an unassigned patient
    const unassignedPatient = {
      id: `p_unassigned_${Date.now()}`,
      mrn: `MRN-${Date.now()}`,
      name: "Unassigned Patient",
      dateOfBirth: new Date("1955-01-01"),
      emergencyName: "Contact",
      emergencyPhone: "555-9999",
      createdAt: new Date(),
    };
    db.patients.push(unassignedPatient);

    // Caregiver attempts to access unassigned patient profile -> 403
    const res = await makeRequest("GET", `/api/caregiver/patient/${unassignedPatient.id}`, {
      Authorization: `Bearer ${caregiverToken}`,
    });
    assert.equal(res.status, 403, "Caregiver should be blocked from unassigned patient profile");

    // Admin can access all profiles
    const adminRes = await makeRequest("GET", `/api/caregiver/patient/${unassignedPatient.id}`, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.equal(adminRes.status, 200, "Admin can access patient profile");
  });

  test("Reports endpoint returns reports for assigned cohort only", async () => {
    const reportsRes = await makeRequest("GET", "/api/reports", {
      Authorization: `Bearer ${doctorToken}`,
    });
    assert.equal(reportsRes.status, 200);
    const doctor = db.doctors.find((d) => d.userId === "usr-doctor-1");
    const assignedIds = new Set(
      db.patientAssignments.filter((a) => a.active && a.doctorId === doctor?.id).map((a) => a.patientId)
    );

    for (const b of reportsRes.body.bundles) {
      assert.ok(assignedIds.has(b.patient.id), `Patient ${b.patient.id} must be in assigned cohort`);
    }
  });
});

