import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { nextMedicationEventId } from "../../src/lib/engines/ids";
import { prisma } from "../../src/lib/db";

describe("ID generation engine", () => {
  test("generates expected deterministic format ME-YYYYMMDD-HHMM-NNN", async () => {
    const scheduledAt = new Date(2026, 4, 15, 9, 30, 0); // May 15, 2026 09:30
    const id1 = await nextMedicationEventId(scheduledAt);
    assert.equal(id1, "ME-20260515-0930-001");
  });

  test("increments monotonically when existing events exist in the same slot", async () => {
    const scheduledAt = new Date(2026, 4, 15, 14, 0, 0); // May 15, 2026 14:00
    const id1 = await nextMedicationEventId(scheduledAt);
    assert.equal(id1, "ME-20260515-1400-001");

    // Create event with this id
    await prisma.medicationEvent.create({
      data: {
        id: id1,
        patientId: "patient-id-test",
        planId: "plan-id-test",
        scheduledAt,
        state: "SCHEDULED",
      },
    });

    const id2 = await nextMedicationEventId(scheduledAt);
    assert.equal(id2, "ME-20260515-1400-002");

    await prisma.medicationEvent.create({
      data: {
        id: id2,
        patientId: "patient-id-test",
        planId: "plan-id-test-2",
        scheduledAt,
        state: "SCHEDULED",
      },
    });

    const id3 = await nextMedicationEventId(scheduledAt);
    assert.equal(id3, "ME-20260515-1400-003");
  });
});
