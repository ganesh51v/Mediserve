import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Admin Console Rebuild - Architectural & Feature Parity Verification", () => {
  const newRoutePath = path.resolve("src/spa/routes/AdminConsoleRoute.tsx");
  const newHookPath = path.resolve("src/spa/hooks/useAdminConsoleData.ts");

  test("new files exist alongside existing code", () => {
    assert.ok(fs.existsSync(newRoutePath), "AdminConsoleRoute.tsx must exist");
    assert.ok(fs.existsSync(newHookPath), "useAdminConsoleData.ts must exist");
  });

  test("existing AdminDirectoryRoute.tsx remains untouched and intact", () => {
    const existingRoutePath = path.resolve("src/spa/routes/AdminDirectoryRoute.tsx");
    assert.ok(fs.existsSync(existingRoutePath), "AdminDirectoryRoute.tsx must still exist");
    const source = fs.readFileSync(existingRoutePath, "utf-8");
    assert.ok(source.includes("export function AdminDirectoryRoute"), "Original component must be unchanged");
  });

  test("new AdminConsoleRoute exports a valid React component", async () => {
    const routeModule = await import("../../src/spa/routes/AdminConsoleRoute");
    assert.equal(typeof routeModule.AdminConsoleRoute, "function", "AdminConsoleRoute component must be exported");
  });

  test("new useAdminConsoleData hook exports valid data hook function", async () => {
    const hookModule = await import("../../src/spa/hooks/useAdminConsoleData");
    assert.equal(typeof hookModule.useAdminConsoleData, "function", "useAdminConsoleData hook must be exported");
  });

  test("AdminConsoleRoute delivers complete feature parity with AdminDirectoryRoute", () => {
    const source = fs.readFileSync(newRoutePath, "utf-8");

    // 1. Stat cards
    assert.ok(source.includes("Total Users"), "Must render Total Users metric");
    assert.ok(source.includes("Patients"), "Must render Patients metric");
    assert.ok(source.includes("Doctors"), "Must render Doctors metric");
    assert.ok(source.includes("Caregivers"), "Must render Caregivers metric");
    assert.ok(source.includes("Dispensers"), "Must render Dispensers metric");

    // 2. Care Team Assignment Panel
    assert.ok(source.includes("Care Team Assignments"), "Must have Care Team Assignments panel");
    assert.ok(source.includes("Attending Physician"), "Must include Attending Physician selector");
    assert.ok(source.includes("Primary Caregiver"), "Must include Primary Caregiver selector");
    assert.ok(source.includes("Save Care Team Assignment"), "Must have Save Care Team button");
    assert.ok(source.includes("Current Patient Registry &amp; Teams") || source.includes("Current Patient Registry"), "Must list Current Patient Registry & Teams");

    // 3. Hardware Provisioning Panel
    assert.ok(source.includes("Register Dispensary Hardware"), "Must have Register Dispensary Hardware panel");
    assert.ok(source.includes("Device Serial Number"), "Must have Device Serial Number input");
    assert.ok(source.includes("Assign to Patient (Optional)"), "Must have patient assignment option");
    assert.ok(source.includes("Provision Hardware Unit"), "Must have provision submit button");
    assert.ok(source.includes("Provisioned Fleet"), "Must display Provisioned Fleet inventory list");

    // 4. Auth & Role gating
    assert.ok(source.includes("user.role !== \"ADMIN\""), "Must have explicit role authorization check");
    assert.ok(source.includes("Navigate to=\"/login\""), "Must redirect unauthenticated users");

    // 5. Loading, Empty, and Error states
    assert.ok(source.includes("Loading administrative registry..."), "Must include loading state");
    assert.ok(source.includes("No patients registered in directory"), "Must have empty state for patients");
    assert.ok(source.includes("No dispensary hardware units provisioned yet"), "Must have empty state for devices");
    assert.ok(source.includes("Sync Registry"), "Must offer on-demand refresh capability");
  });
});
