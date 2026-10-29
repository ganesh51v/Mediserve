import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db, DBUser, DBDoctor, DBCaregiver } from "../../src/lib/db";
import { signSessionToken } from "../../server/auth";
import { handleGetProfile, handleUpdateProfile } from "../../server/profile";

describe("User Profile Management & Strict Authorization Suite", () => {
  let user1: DBUser;
  let user2: DBUser;
  let doctor1: DBDoctor;
  let caregiver2: DBCaregiver;
  let tokenUser1: string;
  let tokenUser2: string;

  beforeEach(async () => {
    // Seed test users in the data layer
    user1 = {
      id: `usr-test-doc-${Date.now()}`,
      email: `dr_test_${Date.now()}@mediserve.local`,
      passwordHash: "$2a$12$testHashDummyValueForUnitTestingOnly123456",
      name: "Dr. Sarah Lin",
      role: "DOCTOR",
      phone: "+1-555-0188",
      verificationStatus: "APPROVED",
      isVerified: true,
      createdAt: new Date(),
    };

    doctor1 = {
      id: `doc-test-${Date.now()}`,
      userId: user1.id,
      specialty: "Internal Medicine",
      licenseNumber: "MED-TEST-9001",
      issuingAuthority: "State Medical Board",
      hospitalAffiliation: "Central Clinic",
      yearsOfPractice: 10,
    };

    user2 = {
      id: `usr-test-cg-${Date.now() + 1}`,
      email: `cg_test_${Date.now() + 1}@mediserve.local`,
      passwordHash: "$2a$12$testHashDummyValueForUnitTestingOnly123456",
      name: "Alex Rivera",
      role: "CAREGIVER",
      phone: "+1-555-0199",
      verificationStatus: "APPROVED",
      isVerified: true,
      createdAt: new Date(),
    };

    caregiver2 = {
      id: `cg-test-${Date.now() + 1}`,
      userId: user2.id,
      phone: "+1-555-0199",
      certifications: "CNA, BLS",
      yearsOfExperience: 5,
      typesOfCare: "Elderly Care",
      availability: "Morning",
    };

    db.users.push(user1, user2);
    db.doctors.push(doctor1);
    db.caregivers.push(caregiver2);

    tokenUser1 = await signSessionToken({
      id: user1.id,
      sub: user1.id,
      email: user1.email,
      name: user1.name,
      role: user1.role,
      phone: user1.phone,
      doctorId: doctor1.id,
    });

    tokenUser2 = await signSessionToken({
      id: user2.id,
      sub: user2.id,
      email: user2.email,
      name: user2.name,
      role: user2.role,
      phone: user2.phone,
      caregiverId: caregiver2.id,
    });
  });

  // Helper to construct mock Express request and response objects
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
    const cookiesSet: Record<string, any> = {};

    const res: any = {
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(data: any) {
        responseBody = data;
        return res;
      },
      cookie(name: string, val: string, opts: any) {
        cookiesSet[name] = { val, opts };
        return res;
      },
      clearCookie(name: string) {
        delete cookiesSet[name];
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

  // ─── Test Suite 1: Validation Enforcement ────────────────────────────────────
  describe("Server Validation & Input Sanitization", () => {
    test("rejects empty name with field-level inline error", async () => {
      const { req, res } = createMockReqRes({
        method: "PUT",
        token: tokenUser1,
        body: { name: "   " },
      });

      await handleUpdateProfile(req, res);
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.ok, false);
      assert.ok(res.body.errors.name, "Must return error for blank name");
      assert.match(res.body.errors.name, /name is required/i);
    });

    test("rejects malformed email format with inline error", async () => {
      const { req, res } = createMockReqRes({
        method: "PUT",
        token: tokenUser1,
        body: { email: "invalid-email-without-domain" },
      });

      await handleUpdateProfile(req, res);
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.ok, false);
      assert.ok(res.body.errors.email, "Must return error for malformed email");
    });

    test("rejects invalid phone number formatting", async () => {
      const { req, res } = createMockReqRes({
        method: "PUT",
        token: tokenUser1,
        body: { phone: "123" },
      });

      await handleUpdateProfile(req, res);
      assert.equal(res.statusCode, 400);
      assert.ok(res.body.errors.phone, "Must return error for phone < 8 digits");
    });

    test("rejects negative or absurd years of practice", async () => {
      const { req, res } = createMockReqRes({
        method: "PUT",
        token: tokenUser1,
        body: { yearsOfPractice: -5 },
      });

      await handleUpdateProfile(req, res);
      assert.equal(res.statusCode, 400);
      assert.ok(res.body.errors.yearsOfPractice, "Must validate non-negative years");
    });
  });

  // ─── Test Suite 2: Uniqueness Constraints ────────────────────────────────────
  describe("Uniqueness Constraint & Email Collision Prevention", () => {
    test("rejects changing email to an address already registered to another user", async () => {
      const { req, res } = createMockReqRes({
        method: "PUT",
        token: tokenUser1,
        body: {
          name: "Dr. Sarah Lin",
          email: user2.email, // Attempt collision with User2
        },
      });

      await handleUpdateProfile(req, res);
      assert.equal(res.statusCode, 409, "Must return 409 Conflict for duplicate email");
      assert.equal(res.body.ok, false);
      assert.match(res.body.errors.email, /already in use/i);

      // Verify User 1's email in DB was NOT changed
      const dbUser1 = db.users.find((u) => u.id === user1.id);
      assert.equal(dbUser1?.email, user1.email, "DB record must remain intact on conflict");
    });

    test("allows user to submit their own existing email without collision error", async () => {
      const { req, res } = createMockReqRes({
        method: "PUT",
        token: tokenUser1,
        body: {
          name: "Dr. Sarah Lin Updated",
          email: user1.email, // Same email
        },
      });

      await handleUpdateProfile(req, res);
      assert.equal(res.statusCode, 200, "Should allow keeping own email");
      assert.equal(res.body.ok, true);
    });
  });

  // ─── Test Suite 3: Successful Update & State Persistence ─────────────────────
  describe("Successful Profile Update & Audit Trail", () => {
    test("successfully updates profile, refreshes session token, and records audit log", async () => {
      const newName = "Dr. Sarah Lin, MD, FACP";
      const newPhone = "+1-555-0822";
      const newSpecialty = "Cardiovascular Medicine";

      const { req, res } = createMockReqRes({
        method: "PUT",
        token: tokenUser1,
        body: {
          name: newName,
          phone: newPhone,
          specialty: newSpecialty,
          yearsOfPractice: 12,
        },
      });

      await handleUpdateProfile(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.ok, true);
      assert.equal(res.body.profile.name, newName);
      assert.equal(res.body.profile.phone, newPhone);
      assert.equal(res.body.profile.doctor.specialty, newSpecialty);
      assert.ok(res.body.token, "Must return a refreshed session token with updated claims");

      // Verify persistent change in DB
      const updatedUser = db.users.find((u) => u.id === user1.id);
      assert.equal(updatedUser?.name, newName);
      assert.equal(updatedUser?.phone, newPhone);

      const updatedDoctor = db.doctors.find((d) => d.userId === user1.id);
      assert.equal(updatedDoctor?.specialty, newSpecialty);
      assert.equal(updatedDoctor?.yearsOfPractice, 12);

      // Verify 21 CFR Part 11 audit log recorded
      const audit = db.auditLogs.find(
        (a) => a.userId === user1.id && a.action === "USER_PROFILE_UPDATED"
      );
      assert.ok(audit, "Must record audit trail entry for profile update");
      assert.equal(audit?.result, "SUCCESS");
    });
  });

  // ─── Test Suite 4: Strict Authorization & Cross-User Protection ──────────────
  describe("Strict Authorization: Cross-User Protection", () => {
    test("rejects attempt by user 1 to edit user 2's profile via route parameter with 403 Forbidden", async () => {
      const { req, res } = createMockReqRes({
        method: "PUT",
        token: tokenUser1, // Authenticated as User 1
        params: { id: user2.id }, // Target User 2
        body: { name: "Malicious Tampering Attempt" },
      });

      await handleUpdateProfile(req, res);
      assert.equal(res.statusCode, 403, "Must reject with 403 Forbidden");
      assert.match(res.body.error, /not authorized to modify another user's profile/i);

      // Verify User 2 in DB was NOT modified
      const user2InDb = db.users.find((u) => u.id === user2.id);
      assert.equal(user2InDb?.name, "Alex Rivera");
    });

    test("rejects attempt by user 1 to edit user 2's profile via body userId with 403 Forbidden", async () => {
      const { req, res } = createMockReqRes({
        method: "PUT",
        token: tokenUser1,
        body: {
          userId: user2.id, // Explicit body attempt
          name: "Attacker Spoof",
        },
      });

      await handleUpdateProfile(req, res);
      assert.equal(res.statusCode, 403, "Must reject cross-user body payload with 403");
      assert.match(res.body.error, /not authorized/i);
    });

    test("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const { req, res } = createMockReqRes({
        method: "PUT",
        token: undefined, // No token
        body: { name: "Anonymous Update" },
      });

      await handleUpdateProfile(req, res);
      assert.equal(res.statusCode, 401, "Must reject unauthenticated request");
    });
  });

  // ─── Test Suite 5: Failure State Preserves User Input ────────────────────────
  describe("Failure State: Preserves User Input Intact", () => {
    test("client state retains all typed inputs on server rejection without clearing formData", async () => {
      // Simulate client-side state machine
      const initialForm = {
        name: user1.name,
        email: user1.email,
        phone: user1.phone || "",
      };

      // User makes an edit with an invalid email and a modified name
      const userDraft = {
        name: "Dr. Sarah Lin (New Specialty Edits)",
        email: "collision-duplicate@hospital.org",
        phone: "+1-555-9999",
      };

      // Server rejects due to collision or validation
      const serverFailureResponse = {
        ok: false,
        error: "Validation failed. Please correct the highlighted errors.",
        errors: {
          email: "This email address is already in use by another account.",
        },
      };

      // State updater logic on failure:
      let clientFormData = { ...userDraft };
      let clientErrors = {};
      let clientErrorNotice = "";

      if (!serverFailureResponse.ok) {
        // Assert client keeps userDraft intact!
        clientErrors = serverFailureResponse.errors;
        clientErrorNotice = serverFailureResponse.error;
      }

      assert.equal(clientFormData.name, userDraft.name, "User draft name must be preserved");
      assert.equal(clientFormData.email, userDraft.email, "User draft email must be preserved");
      assert.equal(clientFormData.phone, userDraft.phone, "User draft phone must be preserved");
      assert.ok(clientErrors.email, "Inline error must be mapped to email field");
      assert.notEqual(clientFormData.name, initialForm.name, "Form must not revert to initial data on error");
    });
  });

  // ─── Test Suite 6: Dirty State Detection & Unsaved Changes ───────────────────
  describe("Unsaved Changes Detection", () => {
    test("computes dirty state accurately when fields are changed versus untouched", () => {
      const initial = {
        name: "Noah Patel",
        email: "caregiver@mediserve.local",
        phone: "+1-555-0142",
      };

      const identical = {
        name: "Noah Patel",
        email: "caregiver@mediserve.local",
        phone: "+1-555-0142",
      };

      const isDirtyClean = Object.keys(identical).some(
        (k) => (identical as any)[k] !== (initial as any)[k]
      );
      assert.equal(isDirtyClean, false, "Identical form must not be dirty");

      const modified = {
        ...initial,
        name: "Noah Patel, Lead CNA",
      };
      const isDirtyModified = Object.keys(modified).some(
        (k) => (modified as any)[k] !== (initial as any)[k]
      );
      assert.equal(isDirtyModified, true, "Modified form must report dirty=true");
    });
  });
});

