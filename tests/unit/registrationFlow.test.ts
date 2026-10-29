/**
 * tests/unit/registrationFlow.test.ts
 *
 * Comprehensive test suite for Healthcare Registration & Verification Gating:
 *  1. Valid doctor registration with professional medical licensing fields
 *  2. Valid caregiver registration with care credentials, experience, and availability
 *  3. Client & Server-side validation failures:
 *      - Invalid email format
 *      - Invalid phone format
 *      - Weak password & missing character classes
 *      - Mismatched password confirmation
 *      - Missing doctor-specific required credentials (license number, issuing authority)
 *      - Missing caregiver-specific required fields (certifications, availability)
 *  4. Duplicate email handling (anti-enumeration defense)
 *  5. Pending-verification gating on clinical protected endpoints (403 Forbidden with code VERIFICATION_PENDING)
 *  6. Administrative approval workflow (status update unlocks protected patient records)
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import app from "../../server/index";
import { db } from "../../src/lib/db";
import {
  validateEmail,
  validatePassword,
  validatePhone,
  hashPassword,
  verifyPassword,
} from "../../server/auth";

// In-process mock request harness
function makeRequest(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: any
) {
  return new Promise<{ status: number; headers: Record<string, string>; body: any }>((resolve) => {
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
    req.ip = "127.0.0.1";

    let statusCode = 200;
    let resBody: any = null;
    const resHeaders: Record<string, string> = {};
    let resolved = false;

    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve({ status: statusCode, headers: resHeaders, body: resBody });
      }
    };

    const res: any = {
      statusCode: 200,
      status(code: number) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      setHeader(name: string, value: any) {
        resHeaders[name.toLowerCase()] = String(value);
        return this;
      },
      set(name: string, value: any) {
        resHeaders[name.toLowerCase()] = String(value);
        return this;
      },
      getHeader(name: string) {
        return resHeaders[name.toLowerCase()];
      },
      cookie(name: string, value: string, options: any) {
        resHeaders["set-cookie"] = `${name}=${encodeURIComponent(value)}; Path=${
          options?.path || "/"
        }${options?.httpOnly ? "; HttpOnly" : ""}; SameSite=${options?.sameSite || "Lax"}`;
        return this;
      },
      clearCookie(name: string, options: any) {
        resHeaders["set-cookie"] = `${name}=; Path=${options?.path || "/"}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        return this;
      },
      json(data: any) {
        resBody = data;
        this.setHeader("content-type", "application/json");
        finish();
      },
      send(data: any) {
        resBody = data;
        finish();
      },
      end(data: any) {
        if (data && !resBody) resBody = data;
        finish();
      },
    };

    (app as any).handle(req, res);
  });
}

describe("Healthcare Registration & Verification Gating Suite", () => {
  // ─── 1. Phone Format Validation Unit Tests ─────────────────────────────────
  describe("Phone Format Validator", () => {
    test("accepts valid E.164 and standard North American phone numbers", () => {
      assert.equal(validatePhone("+1-555-0199").valid, true);
      assert.equal(validatePhone("(555) 234-5678").valid, true);
      assert.equal(validatePhone("+15551234567").valid, true);
      assert.equal(validatePhone("555-876-5432").valid, true);
    });

    test("rejects invalid or too short phone numbers", () => {
      assert.equal(validatePhone("123").valid, false);
      assert.equal(validatePhone("abc-def-ghij").valid, false);
      assert.equal(validatePhone("").valid, false);
      assert.equal(validatePhone(null).valid, false);
    });
  });

  // ─── 2. Valid Doctor Registration ──────────────────────────────────────────
  describe("Doctor Onboarding (POST /api/auth/register)", () => {
    test("successfully onboards an attending doctor with medical licensing fields in PENDING status", async () => {
      const email = `dr_lin_${Date.now()}@hospital.org`;
      const res = await makeRequest("POST", "/api/auth/register", {}, {
        fullName: "Dr. Marcus Lin, MD",
        email,
        phone: "+1-555-0188",
        password: "DoctorPass#2026",
        confirmPassword: "DoctorPass#2026",
        role: "DOCTOR",
        licenseNumber: "MED-WA-88492",
        issuingAuthority: "Washington State Medical Commission",
        specialty: "Internal Medicine & Geriatrics",
        hospitalAffiliation: "Providence Clinical Center",
        yearsOfPractice: 12,
      });

      assert.equal(res.status, 201, "Returns 201 Created");
      assert.equal(res.body.ok, true);
      assert.equal(res.body.status, "PENDING_VERIFICATION");
      assert.equal(res.body.verificationStatus, "PENDING");
      assert.equal(res.body.isVerified, false);
      assert.equal(res.body.user.role, "DOCTOR");
      assert.ok(res.body.token, "Returns issued session token");

      // Verify doctor was persisted in MemoryDatabase with credentials
      const createdUser = db.users.find((u) => u.email === email);
      assert.ok(createdUser, "User record created in database");
      assert.equal(createdUser.verificationStatus, "PENDING");
      assert.equal(createdUser.isVerified, false);

      const doctorProfile = db.doctors.find((d) => d.userId === createdUser.id);
      assert.ok(doctorProfile, "Doctor clinical profile created");
      assert.equal(doctorProfile.licenseNumber, "MED-WA-88492");
      assert.equal(doctorProfile.issuingAuthority, "Washington State Medical Commission");
      assert.equal(doctorProfile.yearsOfPractice, 12);
    });
  });

  // ─── 3. Valid Caregiver Registration ───────────────────────────────────────
  describe("Caregiver Onboarding (POST /api/auth/register)", () => {
    test("successfully onboards a caregiver with credentials and availability in PENDING status", async () => {
      const email = `caregiver_sarah_${Date.now()}@mediserve.org`;
      const res = await makeRequest("POST", "/api/auth/register", {}, {
        fullName: "Sarah Connor, RN",
        email,
        phone: "+1-555-0144",
        password: "CaregiverPass!2026",
        confirmPassword: "CaregiverPass!2026",
        role: "CAREGIVER",
        certifications: "RN, BLS/CPR, Medication Administration Certified",
        yearsOfExperience: 7,
        typesOfCare: "Elderly Care, Dementia Support, Post-Op Monitoring",
        availability: "Full-Time (Day / Evening Shifts)",
      });

      assert.equal(res.status, 201, "Returns 201 Created");
      assert.equal(res.body.ok, true);
      assert.equal(res.body.status, "PENDING_VERIFICATION");
      assert.equal(res.body.verificationStatus, "PENDING");
      assert.equal(res.body.isVerified, false);
      assert.equal(res.body.user.role, "CAREGIVER");

      // Verify caregiver was persisted in MemoryDatabase with credentials
      const createdUser = db.users.find((u) => u.email === email);
      assert.ok(createdUser, "User record created in database");
      assert.equal(createdUser.verificationStatus, "PENDING");

      const caregiverProfile = db.caregivers.find((c) => c.userId === createdUser.id);
      assert.ok(caregiverProfile, "Caregiver profile created");
      assert.equal(caregiverProfile.certifications, "RN, BLS/CPR, Medication Administration Certified");
      assert.equal(caregiverProfile.yearsOfExperience, 7);
    });
  });

  // ─── 4. Client and Server-Side Validation Failures ─────────────────────────
  describe("Field-Level Validation & Error Reporting", () => {
    test("rejects malformed email format with field-level error", async () => {
      const res = await makeRequest("POST", "/api/auth/register", {}, {
        fullName: "Dr. Test",
        email: "not-a-valid-email",
        phone: "+1-555-0100",
        password: "StrongPass#2026",
        confirmPassword: "StrongPass#2026",
        role: "DOCTOR",
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.errors?.email, "Returns field-level email error");
    });

    test("rejects invalid contact phone format", async () => {
      const res = await makeRequest("POST", "/api/auth/register", {}, {
        fullName: "Elena Rostova",
        email: `valid_${Date.now()}@hospital.org`,
        phone: "123", // Too short
        password: "StrongPass#2026",
        confirmPassword: "StrongPass#2026",
        role: "CAREGIVER",
        certifications: "CNA",
        yearsOfExperience: 2,
        typesOfCare: "Elderly",
        availability: "Full-Time",
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.errors?.phone, "Returns field-level phone error");
    });

    test("rejects weak passwords failing character diversity or length", async () => {
      const res = await makeRequest("POST", "/api/auth/register", {}, {
        fullName: "Dr. Weak Password",
        email: `dr_weak_${Date.now()}@hospital.org`,
        phone: "+1-555-0100",
        password: "weak",
        confirmPassword: "weak",
        role: "DOCTOR",
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.errors?.password, "Returns password length error");
    });

    test("rejects mismatched password confirmation", async () => {
      const res = await makeRequest("POST", "/api/auth/register", {}, {
        fullName: "Dr. Mismatched",
        email: `mismatch_${Date.now()}@hospital.org`,
        phone: "+1-555-0100",
        password: "CorrectPass#2026",
        confirmPassword: "DifferentPass#2026",
        role: "DOCTOR",
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.errors?.confirmPassword, "Returns confirmPassword error");
    });

    test("rejects doctor registration missing required medical license number", async () => {
      const res = await makeRequest("POST", "/api/auth/register", {}, {
        fullName: "Dr. Missing License",
        email: `dr_nolicense_${Date.now()}@hospital.org`,
        phone: "+1-555-0100",
        password: "DoctorPass#2026",
        confirmPassword: "DoctorPass#2026",
        role: "DOCTOR",
        licenseNumber: "", // Missing
        issuingAuthority: "State Board",
        specialty: "Internal Medicine",
        hospitalAffiliation: "City Hospital",
        yearsOfPractice: 5,
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.errors?.licenseNumber, "Returns required licenseNumber error");
    });

    test("rejects caregiver registration missing credentials or availability", async () => {
      const res = await makeRequest("POST", "/api/auth/register", {}, {
        fullName: "Caregiver Missing Info",
        email: `cg_missing_${Date.now()}@mediserve.org`,
        phone: "+1-555-0199",
        password: "CaregiverPass#2026",
        confirmPassword: "CaregiverPass#2026",
        role: "CAREGIVER",
        certifications: "", // Missing
        yearsOfExperience: 3,
        typesOfCare: "Elderly",
        availability: "", // Missing
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.errors?.certifications, "Returns required certifications error");
      assert.ok(res.body.errors?.availability, "Returns required availability error");
    });
  });

  // ─── 5. Duplicate Email Handling (Anti-Enumeration) ─────────────────────────
  describe("Duplicate Account Prevention", () => {
    test("rejects duplicate email registration safely", async () => {
      const duplicateEmail = `dupe_${Date.now()}@mediserve.org`;

      // Initial registration
      await makeRequest("POST", "/api/auth/register", {}, {
        fullName: "First Registrant",
        email: duplicateEmail,
        phone: "+1-555-0100",
        password: "StrongPass#2026",
        confirmPassword: "StrongPass#2026",
        role: "CAREGIVER",
      });

      // Duplicate attempt
      const res = await makeRequest("POST", "/api/auth/register", {}, {
        fullName: "Second Registrant",
        email: duplicateEmail,
        phone: "+1-555-0100",
        password: "StrongPass#2026",
        confirmPassword: "StrongPass#2026",
        role: "CAREGIVER",
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.error, "Returns safe rejection message");
    });
  });

  // ─── 6. Verification Gating on Clinical Protected Routes ───────────────────
  describe("Clinical Verification Gating Restriction", () => {
    test("blocks pending caregiver from accessing clinical patient records with 403 VERIFICATION_PENDING", async () => {
      // 1. Register a new caregiver (starts in PENDING status)
      const regRes = await makeRequest("POST", "/api/auth/register", {}, {
        fullName: "Pending Caregiver",
        email: `pending_cg_${Date.now()}@mediserve.org`,
        phone: "+1-555-0122",
        password: "CaregiverPass#2026",
        confirmPassword: "CaregiverPass#2026",
        role: "CAREGIVER",
      });

      assert.equal(regRes.status, 201);
      const token = regRes.body.token;
      assert.ok(token);

      // 2. Attempt to access caregiver dashboard with the pending token
      const dashboardRes = await makeRequest("GET", "/api/caregiver/dashboard", {
        Authorization: `Bearer ${token}`,
      });

      assert.equal(dashboardRes.status, 403, "Must block pending accounts with 403 Forbidden");
      assert.equal(dashboardRes.body.code, "VERIFICATION_PENDING");
      assert.equal(dashboardRes.body.verificationStatus, "PENDING");
    });

    test("blocks pending doctor from accessing clinical prescriptions with 403 VERIFICATION_PENDING", async () => {
      // 1. Register a new doctor (starts in PENDING status)
      const regRes = await makeRequest("POST", "/api/auth/register", {}, {
        fullName: "Pending Doctor MD",
        email: `pending_doc_${Date.now()}@hospital.org`,
        phone: "+1-555-0133",
        password: "DoctorPass#2026",
        confirmPassword: "DoctorPass#2026",
        role: "DOCTOR",
      });

      assert.equal(regRes.status, 201);
      const token = regRes.body.token;
      assert.ok(token);

      // 2. Attempt to access doctor overview with the pending token
      const overviewRes = await makeRequest("GET", "/api/doctor/overview", {
        Authorization: `Bearer ${token}`,
      });

      assert.equal(overviewRes.status, 403, "Must block pending doctor with 403 Forbidden");
      assert.equal(overviewRes.body.code, "VERIFICATION_PENDING");
    });

    test("admin approval unlocks protected clinical access", async () => {
      // 1. Register a pending caregiver
      const email = `approve_test_${Date.now()}@mediserve.org`;
      const regRes = await makeRequest("POST", "/api/auth/register", {}, {
        fullName: "Approved Caregiver",
        email,
        phone: "+1-555-0199",
        password: "CaregiverPass#2026",
        confirmPassword: "CaregiverPass#2026",
        role: "CAREGIVER",
      });

      const userId = regRes.body.user.id;
      const initialToken = regRes.body.token;

      // 2. Confirm initial access is blocked
      const blockedRes = await makeRequest("GET", "/api/caregiver/dashboard", {
        Authorization: `Bearer ${initialToken}`,
      });
      assert.equal(blockedRes.status, 403);

      // 3. Admin approves credentials via /api/admin/verify-user
      // Login as admin
      const adminLogin = await makeRequest("POST", "/api/auth/login", {}, {
        email: "admin@mediserve.local",
        password: "MediServe!23",
      });
      const adminToken = adminLogin.body.token;

      const verifyRes = await makeRequest(
        "POST",
        "/api/admin/verify-user",
        { Authorization: `Bearer ${adminToken}` },
        { userId, status: "APPROVED" }
      );
      assert.equal(verifyRes.status, 200);
      assert.equal(verifyRes.body.verificationStatus, "APPROVED");

      // 4. Caregiver signs in again, gets active APPROVED token
      const loginRes = await makeRequest("POST", "/api/auth/login", {}, {
        email,
        password: "CaregiverPass#2026",
      });
      const approvedToken = loginRes.body.token;

      // 5. Access is now unlocked
      const unlockedRes = await makeRequest("GET", "/api/caregiver/dashboard", {
        Authorization: `Bearer ${approvedToken}`,
      });
      assert.equal(unlockedRes.status, 200, "Approved user successfully accesses dashboard");
    });
  });
});
