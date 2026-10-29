import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("14 Routes Specification & Verification", () => {
  const REQUIRED_ROUTES = [
    { path: "/login", name: "Login page" },
    { path: "/", name: "Role-based home redirect" },
    { path: "/caregiver", name: "Caregiver dashboard" },
    { path: "/caregiver/patients/:id", name: "Caregiver patient profile" },
    { path: "/caregiver/alerts", name: "Caregiver alerts & notifications" },
    { path: "/caregiver/reports", name: "Caregiver 30-day reports" },
    { path: "/doctor", name: "Doctor patient overview" },
    { path: "/doctor/patients/:id", name: "Doctor clinical monitoring" },
    { path: "/doctor/alerts", name: "Doctor alerts feed" },
    { path: "/doctor/reports", name: "Doctor clinical reports" },
    { path: "/admin", name: "Admin system directory" },
    { path: "/admin/audit", name: "Admin audit log" },
    { path: "/admin/devices", name: "Admin devices fleet" },
    { path: "/simulator", name: "Hardware OLED simulator" },
  ];

  test("all 14 routes are defined and accounted for", () => {
    assert.equal(REQUIRED_ROUTES.length, 14, "Must have exactly 14 routes");
    const uniquePaths = new Set(REQUIRED_ROUTES.map((r) => r.path));
    assert.equal(uniquePaths.size, 14, "All 14 routes must have distinct paths");
  });

  test("App component source registers all 14 route paths", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const appSource = fs.readFileSync(path.resolve("src/spa/App.tsx"), "utf-8");

    for (const r of REQUIRED_ROUTES) {
      assert.ok(
        appSource.includes(`path="${r.path}"`),
        `Route path ${r.path} (${r.name}) must be declared in App.tsx`,
      );
    }
  });

  test("UI components Shell, Panel, StatusDot, PriorityMark, and OledSimulatorPanel are exported", async () => {
    const ui = await import("../../src/spa/components/ui");
    assert.equal(typeof ui.Shell, "function");
    assert.equal(typeof ui.Panel, "function");
    assert.equal(typeof ui.StatusDot, "function");
    assert.equal(typeof ui.PriorityMark, "function");
    assert.equal(typeof ui.OledSimulatorPanel, "function");
  });

  test("Custom data fetching hooks are defined and exported", async () => {
    const hooks = await import("../../src/spa/hooks");
    assert.equal(typeof hooks.useAuth, "function");
    assert.equal(typeof hooks.useCaregiverDashboard, "function");
    assert.equal(typeof hooks.usePatientProfile, "function");
    assert.equal(typeof hooks.useDoctorOverview, "function");
    assert.equal(typeof hooks.useAlerts, "function");
    assert.equal(typeof hooks.useReports, "function");
    assert.equal(typeof hooks.useAdminDirectory, "function");
    assert.equal(typeof hooks.useAdminDevices, "function");
    assert.equal(typeof hooks.useAdminAudit, "function");
    assert.equal(typeof hooks.useSimulator, "function");
    assert.equal(typeof hooks.useMealActions, "function");
    assert.equal(typeof hooks.usePlanActions, "function");
    assert.equal(typeof hooks.useNoteActions, "function");
  });
});
