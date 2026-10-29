import { test, describe } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3000";

describe("Live Server & 14 Routes HTTP Verification", () => {
  let caregiverCookie = "";
  let doctorCookie = "";
  let adminCookie = "";

  test("POST /api/auth/login works for caregiver", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "caregiver@mediserve.local",
        password: "MediServe!23",
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.user.role, "CAREGIVER");
    assert.equal(data.redirect, "/caregiver");

    const setCookie = res.headers.get("set-cookie");
    assert.ok(setCookie, "Session cookie must be set");
    caregiverCookie = setCookie.split(";")[0];
  });

  test("POST /api/auth/login works for doctor", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "doctor@mediserve.local",
        password: "MediServe!23",
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.user.role, "DOCTOR");
    assert.equal(data.redirect, "/doctor");
    const setCookie = res.headers.get("set-cookie");
    doctorCookie = setCookie!.split(";")[0];
  });

  test("POST /api/auth/login works for admin", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@mediserve.local",
        password: "MediServe!23",
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.user.role, "ADMIN");
    assert.equal(data.redirect, "/admin");
    const setCookie = res.headers.get("set-cookie");
    adminCookie = setCookie!.split(";")[0];
  });

  test("GET /api/auth/me returns session user", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: caregiverCookie },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.user?.role, "CAREGIVER");
  });

  test("GET /api/caregiver/dashboard returns patients & totals", async () => {
    const res = await fetch(`${BASE_URL}/api/caregiver/dashboard`, {
      headers: { Cookie: caregiverCookie },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.patients));
    assert.ok(data.totals);
  });

  test("GET /api/doctor/overview returns doctor rows", async () => {
    const res = await fetch(`${BASE_URL}/api/doctor/overview`, {
      headers: { Cookie: doctorCookie },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.rows));
  });

  test("GET /api/admin/data returns system directory", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/data`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.patients));
    assert.ok(Array.isArray(data.devices));
  });

  test("GET /api/simulator/data returns devices and pending", async () => {
    const res = await fetch(`${BASE_URL}/api/simulator/data`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.devices));
  });

  // Verify all 14 frontend routes return HTTP 200
  test("Route 1: /login renders", async () => {
    const res = await fetch(`${BASE_URL}/login`);
    assert.equal(res.status, 200);
  });

  test("Route 2: / redirect behaves correctly", async () => {
    const res = await fetch(`${BASE_URL}/`, { redirect: "manual" });
    assert.ok([200, 307, 308].includes(res.status));
  });

  test("Route 3: /caregiver renders for caregiver", async () => {
    const res = await fetch(`${BASE_URL}/caregiver`, {
      headers: { Cookie: caregiverCookie },
    });
    assert.equal(res.status, 200);
  });

  test("Route 4: /caregiver/patients/cm00000010000000000000001 renders", async () => {
    const res = await fetch(`${BASE_URL}/caregiver/patients/cm00000010000000000000001`, {
      headers: { Cookie: caregiverCookie },
    });
    assert.equal(res.status, 200);
  });

  test("Route 5: /caregiver/alerts renders", async () => {
    const res = await fetch(`${BASE_URL}/caregiver/alerts`, {
      headers: { Cookie: caregiverCookie },
    });
    assert.equal(res.status, 200);
  });

  test("Route 6: /caregiver/reports renders", async () => {
    const res = await fetch(`${BASE_URL}/caregiver/reports`, {
      headers: { Cookie: caregiverCookie },
    });
    assert.equal(res.status, 200);
  });

  test("Route 7: /doctor renders for doctor", async () => {
    const res = await fetch(`${BASE_URL}/doctor`, {
      headers: { Cookie: doctorCookie },
    });
    assert.equal(res.status, 200);
  });

  test("Route 8: /doctor/patients/cm00000010000000000000001 renders", async () => {
    const res = await fetch(`${BASE_URL}/doctor/patients/cm00000010000000000000001`, {
      headers: { Cookie: doctorCookie },
    });
    assert.equal(res.status, 200);
  });

  test("Route 9: /doctor/alerts renders", async () => {
    const res = await fetch(`${BASE_URL}/doctor/alerts`, {
      headers: { Cookie: doctorCookie },
    });
    assert.equal(res.status, 200);
  });

  test("Route 10: /doctor/reports renders", async () => {
    const res = await fetch(`${BASE_URL}/doctor/reports`, {
      headers: { Cookie: doctorCookie },
    });
    assert.equal(res.status, 200);
  });

  test("Route 11: /admin renders for admin", async () => {
    const res = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(res.status, 200);
  });

  test("Route 12: /admin/audit renders", async () => {
    const res = await fetch(`${BASE_URL}/admin/audit`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(res.status, 200);
  });

  test("Route 13: /admin/devices renders", async () => {
    const res = await fetch(`${BASE_URL}/admin/devices`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(res.status, 200);
  });

  test("Route 14: /simulator renders", async () => {
    const res = await fetch(`${BASE_URL}/simulator`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(res.status, 200);
  });
});
