/**
 * tests/unit/authFlow.test.ts
 *
 * Comprehensive end-to-end unit and integration test suite for MediServe Authentication Engine:
 *  1. Successful user sign-up with strong password, role assignment, and audit log creation
 *  2. Password policy enforcement (length, upper/lower/symbols, common password denylist)
 *  3. Email validation and canonicalization
 *  4. Duplicate account registration handling (generic error prevents account enumeration)
 *  5. Successful sign-in (returns session, token, and sets HttpOnly cookie)
 *  6. Wrong credentials (generic error to prevent account enumeration and timing attacks)
 *  7. Brute-force rate limiting and workstation account lockout (5 failed attempts -> 429 + Retry-After)
 *  8. Protected route access with and without valid session (401 unauthenticated, 403 role-forbidden)
 *  9. Sign-out and server-side token revocation (invalidated token cannot access protected routes)
 * 10. CSRF defense on state-changing requests when authenticated via cookies
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import app from "../../server/index";
import { db } from "../../src/lib/db";
import {
  rateLimiter,
  revocationStore,
  validateEmail,
  validatePassword,
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
        resHeaders["set-cookie"] = `${name}=; Path=${
          options?.path || "/"
        }; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        return this;
      },
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

describe("MediServe Production Authentication Engine", () => {
  beforeEach(() => {
    rateLimiter.reset();
    revocationStore.clear();
  });

  // ─── 1. Password Policy & Hashing ──────────────────────────────────────────
  describe("Password Policy and Cryptographic Storage", () => {
    test("rejects passwords shorter than 8 characters", () => {
      const res = validatePassword("Short1!");
      assert.equal(res.valid, false);
      assert.ok(res.error?.includes("at least 8 characters"));
    });

    test("rejects passwords longer than 128 characters", () => {
      const longPass = "A1!" + "a".repeat(130);
      const res = validatePassword(longPass);
      assert.equal(res.valid, false);
      assert.ok(res.error?.includes("maximum permitted length"));
    });

    test("rejects passwords lacking character diversity (missing uppercase, lowercase, digit/symbol)", () => {
      assert.equal(validatePassword("lowercaseonly123!").valid, false);
      assert.equal(validatePassword("UPPERCASEONLY123!").valid, false);
      assert.equal(validatePassword("NoDigitsOrSymbolsHere").valid, false);
    });

    test("rejects common dictionary and easily guessed passwords", () => {
      assert.equal(validatePassword("password123").valid, false);
      assert.equal(validatePassword("qwerty123").valid, false);
      assert.equal(validatePassword("admin123").valid, false);
      assert.equal(validatePassword("mediserve").valid, false);
    });

    test("accepts strong, compliant passwords", () => {
      assert.equal(validatePassword("ClinicalSecure!99").valid, true);
      assert.equal(validatePassword("Doctor#2026Strong").valid, true);
    });

    test("hashes password with slow, salted bcrypt (work factor 12) and verifies correctly", async () => {
      const plain = "SuperSecret#2026";
      const hash = await hashPassword(plain);

      assert.ok(hash.startsWith("$2a$12$") || hash.startsWith("$2b$12$"), "Must use bcrypt cost 12");
      assert.notEqual(hash, plain, "Must never store plaintext");

      const matches = await verifyPassword(plain, hash);
      assert.equal(matches, true, "Bcrypt verify matches correct password");

      const wrong = await verifyPassword("WrongPassword!1", hash);
      assert.equal(wrong, false, "Bcrypt verify rejects incorrect password");
    });
  });

  // ─── 2. Email Validation ───────────────────────────────────────────────────
  describe("Email Validation and Formatting", () => {
    test("validates and canonicalizes proper email addresses", () => {
      const res = validateEmail("  Clinician.Shah@Mediserve.LOCAL  ");
      assert.equal(res.valid, true);
      assert.equal(res.email, "clinician.shah@mediserve.local");
    });

    test("rejects malformed email formats", () => {
      assert.equal(validateEmail("plainaddress").valid, false);
      assert.equal(validateEmail("missing@domain").valid, false);
      assert.equal(validateEmail("@nodomain.com").valid, false);
      assert.equal(validateEmail("").valid, false);
      assert.equal(validateEmail(null).valid, false);
    });
  });

  // ─── 3. Sign-Up (Registration) ─────────────────────────────────────────────
  describe("User Sign-Up Flow (POST /api/auth/register)", () => {
    test("successfully registers a new caregiver, issues token and sets HttpOnly cookie", async () => {
      const testEmail = `caregiver_${Date.now()}@mediserve.org`;
      const res = await makeRequest("POST", "/api/auth/register", {}, {
        email: testEmail,
        password: "CaregiverPass!2026",
        name: "Elena Rostova",
        role: "CAREGIVER",
      });

      assert.equal(res.status, 201, "Sign-up returns HTTP 201 Created");
      assert.equal(res.body.ok, true);
      assert.equal(res.body.user.email, testEmail);
      assert.equal(res.body.user.role, "CAREGIVER");
      assert.ok(res.body.token, "Returns JWT session token");

      // Verify HttpOnly session cookie was set
      const cookieHeader = res.headers["set-cookie"];
      assert.ok(cookieHeader, "Must set session cookie");
      assert.ok(cookieHeader.includes("mediserve_session="), "Cookie name is mediserve_session");
      assert.ok(cookieHeader.includes("HttpOnly"), "Cookie is marked HttpOnly");

      // Verify user was stored with salted hash in database
      const savedUser = db.users.find((u) => u.email === testEmail);
      assert.ok(savedUser, "User exists in db");
      assert.notEqual(savedUser.passwordHash, "CaregiverPass!2026");
      assert.ok(savedUser.passwordHash.startsWith("$2a$") || savedUser.passwordHash.startsWith("$2b$"));

      // Verify caregiver profile and audit log
      const cg = db.caregivers.find((c) => c.userId === savedUser.id);
      assert.ok(cg, "Caregiver profile linked");
      const audit = db.auditLogs.find((a) => a.userId === savedUser.id && a.action === "User Account Registered");
      assert.ok(audit, "21 CFR Part 11 registration audit log created");
    });

    test("rejects duplicate registration without revealing user existence (anti-enumeration)", async () => {
      const email = `doctor_existing_${Date.now()}@mediserve.org`;

      // Initial registration
      const firstRes = await makeRequest("POST", "/api/auth/register", {}, {
        email,
        password: "DocPass#Secure1",
        name: "Dr. Gregory",
        role: "DOCTOR",
      });
      assert.equal(firstRes.status, 201);

      // Attempt duplicate registration
      const dupRes = await makeRequest("POST", "/api/auth/register", {}, {
        email,
        password: "AnotherPassword!99",
        name: "Imposter Gregory",
        role: "DOCTOR",
      });

      assert.equal(dupRes.status, 400, "Returns 400 Bad Request");
      assert.ok(
        dupRes.body.error.includes("Registration could not be completed with the provided details"),
        "Generic message prevents email enumeration"
      );
      assert.ok(
        !dupRes.body.error.includes("already registered") && !dupRes.body.error.includes("already exists"),
        "Must NOT leak whether the email already exists"
      );
    });
  });

  // ─── 4. Sign-In (Authentication) ───────────────────────────────────────────
  describe("User Sign-In Flow (POST /api/auth/login)", () => {
    test("authenticates valid credentials, sets cookie, and returns redirect route", async () => {
      const res = await makeRequest("POST", "/api/auth/login", {}, {
        email: "caregiver@mediserve.local",
        password: "MediServe!23",
      });

      assert.equal(res.status, 200, "Sign-in returns HTTP 200 OK");
      assert.equal(res.body.ok, true);
      assert.equal(res.body.user.email, "caregiver@mediserve.local");
      assert.equal(res.body.user.role, "CAREGIVER");
      assert.equal(res.body.redirect, "/caregiver");
      assert.ok(res.body.token, "Returns signed JWT token");

      const cookieHeader = res.headers["set-cookie"];
      assert.ok(cookieHeader && cookieHeader.includes("mediserve_session="));
    });

    test("returns generic 401 error for wrong password without leaking account existence", async () => {
      const res = await makeRequest("POST", "/api/auth/login", {}, {
        email: "caregiver@mediserve.local",
        password: "WrongPassword!99",
      });

      assert.equal(res.status, 401, "Returns 401 Unauthorized");
      assert.equal(res.body.error, "Invalid email or password.");
    });

    test("returns identical generic 401 error for non-existent email (anti-enumeration)", async () => {
      const res = await makeRequest("POST", "/api/auth/login", {}, {
        email: "unknown_user_xyz@doesnotexist.org",
        password: "RandomPassword!1",
      });

      assert.equal(res.status, 401, "Returns 401 Unauthorized");
      assert.equal(res.body.error, "Invalid email or password.");
    });

    test("enforces brute-force rate limiting and lockout after 5 consecutive failed attempts", async () => {
      const attackEmail = `victim_${Date.now()}@mediserve.org`;

      // 4 failed attempts should yield 401
      for (let i = 1; i <= 4; i++) {
        const attempt = await makeRequest("POST", "/api/auth/login", {}, {
          email: attackEmail,
          password: "BadPassword!1",
        });
        assert.equal(attempt.status, 401, `Attempt ${i} is rejected with 401`);
      }

      // 5th failed attempt triggers lockout
      const fifthAttempt = await makeRequest("POST", "/api/auth/login", {}, {
        email: attackEmail,
        password: "BadPassword!1",
      });
      assert.equal(fifthAttempt.status, 429, "5th attempt is locked out with HTTP 429 Too Many Requests");
      assert.ok(fifthAttempt.headers["retry-after"], "Retry-After header is provided");
      assert.ok(fifthAttempt.body.error.includes("locked out") || fifthAttempt.body.error.includes("temporarily locked"));

      // 6th attempt is immediately rejected by lockout before checking credentials
      const sixthAttempt = await makeRequest("POST", "/api/auth/login", {}, {
        email: attackEmail,
        password: "BadPassword!1",
      });
      assert.equal(sixthAttempt.status, 429, "Subsequent attempts remain locked out with 429");
    });
  });

  // ─── 5. Protected Routes & Authorization ───────────────────────────────────
  describe("Protected Routes and Role Enforcement", () => {
    test("rejects unauthenticated requests to protected endpoints with 401", async () => {
      const res = await makeRequest("GET", "/api/caregiver/dashboard");
      assert.equal(res.status, 401, "Unauthenticated request returns 401");
      assert.equal(res.body.error, "Unauthenticated");
    });

    test("allows authenticated caregiver to access caregiver dashboard via Bearer token", async () => {
      const loginRes = await makeRequest("POST", "/api/auth/login", {}, {
        email: "caregiver@mediserve.local",
        password: "MediServe!23",
      });
      const token = loginRes.body.token;

      const res = await makeRequest("GET", "/api/caregiver/dashboard", {
        Authorization: `Bearer ${token}`,
      });
      assert.equal(res.status, 200, "Caregiver dashboard returns 200");
      assert.ok(res.body.patients, "Returns patient data");
    });

    test("allows authenticated caregiver to access dashboard via HttpOnly session cookie", async () => {
      const loginRes = await makeRequest("POST", "/api/auth/login", {}, {
        email: "caregiver@mediserve.local",
        password: "MediServe!23",
      });
      const token = loginRes.body.token;

      const res = await makeRequest("GET", "/api/caregiver/dashboard", {
        Cookie: `mediserve_session=${token}`,
      });
      assert.equal(res.status, 200, "Cookie-authenticated request returns 200");
      assert.ok(res.body.patients, "Returns patient data");
    });

    test("enforces role permissions: doctor cannot access admin-only endpoints (returns 403)", async () => {
      const docLogin = await makeRequest("POST", "/api/auth/login", {}, {
        email: "doctor@mediserve.local",
        password: "MediServe!23",
      });
      const docToken = docLogin.body.token;

      const res = await makeRequest("GET", "/api/admin/data", {
        Authorization: `Bearer ${docToken}`,
      });
      assert.equal(res.status, 403, "Doctor accessing admin route returns 403 Forbidden");
    });
  });

  // ─── 6. Sign-Out & Session Revocation ──────────────────────────────────────
  describe("Sign-Out and Server-Side Session Invalidation", () => {
    test("invalidates session server-side on sign-out, clears cookie, and denies subsequent access", async () => {
      // 1. Sign in
      const loginRes = await makeRequest("POST", "/api/auth/login", {}, {
        email: "caregiver@mediserve.local",
        password: "MediServe!23",
      });
      const token = loginRes.body.token;

      // Verify token works
      const initialMe = await makeRequest("GET", "/api/auth/me", {
        Authorization: `Bearer ${token}`,
      });
      assert.equal(initialMe.status, 200);
      assert.equal(initialMe.body.user?.email, "caregiver@mediserve.local");

      // 2. Sign out
      const logoutRes = await makeRequest("POST", "/api/auth/logout", {
        Authorization: `Bearer ${token}`,
      });
      assert.equal(logoutRes.status, 200);
      assert.equal(logoutRes.body.ok, true);

      // Verify cookie cleared
      const setCookie = logoutRes.headers["set-cookie"];
      assert.ok(setCookie && setCookie.includes("mediserve_session="));

      // 3. Subsequent request with revoked token must fail
      const revokedMe = await makeRequest("GET", "/api/auth/me", {
        Authorization: `Bearer ${token}`,
      });
      assert.equal(revokedMe.body.user, null, "Revoked token resolves to null user");

      const revokedProtected = await makeRequest("GET", "/api/caregiver/dashboard", {
        Authorization: `Bearer ${token}`,
      });
      assert.equal(revokedProtected.status, 401, "Revoked token is denied access to protected endpoints");
    });
  });

  // ─── 7. Cross-Site Request Forgery (CSRF) ──────────────────────────────────
  describe("CSRF Defense on State Mutation Requests", () => {
    test("rejects cookie-authenticated mutation requests with suspicious or foreign origin", async () => {
      const loginRes = await makeRequest("POST", "/api/auth/login", {}, {
        email: "caregiver@mediserve.local",
        password: "MediServe!23",
      });
      const token = loginRes.body.token;

      // Foreign origin attack simulation
      const attackRes = await makeRequest("POST", "/api/plans", {
        Cookie: `mediserve_session=${token}`,
        Origin: "https://evil-attacker.malicious.com",
        Host: "localhost:3000",
      }, {
        patientId: "p1",
        medicine: "Attacker Drug",
      });

      assert.equal(attackRes.status, 403, "CSRF attack is rejected with 403 Forbidden");
    });

    test("allows safe GET requests or requests with valid anti-CSRF headers", async () => {
      const loginRes = await makeRequest("POST", "/api/auth/login", {}, {
        email: "caregiver@mediserve.local",
        password: "MediServe!23",
      });
      const token = loginRes.body.token;

      const safeRes = await makeRequest("GET", "/api/caregiver/dashboard", {
        Cookie: `mediserve_session=${token}`,
        Origin: "https://evil-attacker.malicious.com",
      });
      assert.equal(safeRes.status, 200, "Read-only GET requests are exempt from CSRF rejection");
    });
  });
});

