import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { adherenceForPatient, todayMedicationProgress } from "../../src/lib/engines/adherence";
import { prisma } from "../../src/lib/db";

describe("adherence calculations engine", () => {
  test("calculates adherence rate, missed, delayed, and taken accurately", async () => {
    const patientId = "patient-adherence-test";
    const from = new Date("2026-05-01T00:00:00Z");
    const to = new Date("2026-05-01T23:59:59Z");

    // Clean any prior events for this test patient
    await prisma.medicationEvent.deleteMany({ where: { patientId } });

    // 1. Initially zero events -> 100% adherence default
    let stats = await adherenceForPatient(patientId, from, to);
    assert.equal(stats.ratePct, 100);
    assert.equal(stats.taken, 0);
    assert.equal(stats.missed, 0);

    // 2. Add 1 on-time taken dose (DISPENSED)
    await prisma.medicationEvent.create({
      data: {
        id: "ME-20260501-0800-001",
        patientId,
        planId: "plan-1",
        scheduledAt: new Date("2026-05-01T08:00:00Z"),
        state: "DISPENSED",
        dispensedAt: new Date("2026-05-01T08:05:00Z"),
        delayMinutes: 5,
      },
    });

    // 3. Add 1 delayed taken dose (CONFIRMED, delay 25 min)
    await prisma.medicationEvent.create({
      data: {
        id: "ME-20260501-1200-001",
        patientId,
        planId: "plan-2",
        scheduledAt: new Date("2026-05-01T12:00:00Z"),
        state: "CONFIRMED",
        dispensedAt: new Date("2026-05-01T12:25:00Z"),
        delayMinutes: 25,
      },
    });

    // 4. Add 1 missed dose (MISSED)
    await prisma.medicationEvent.create({
      data: {
        id: "ME-20260501-1800-001",
        patientId,
        planId: "plan-3",
        scheduledAt: new Date("2026-05-01T18:00:00Z"),
        state: "MISSED",
        missedAt: new Date("2026-05-01T20:00:00Z"),
      },
    });

    // 5. Add 1 scheduled dose for later (should be excluded from rate denominator)
    await prisma.medicationEvent.create({
      data: {
        id: "ME-20260501-2200-001",
        patientId,
        planId: "plan-4",
        scheduledAt: new Date("2026-05-01T22:00:00Z"),
        state: "SCHEDULED",
      },
    });

    stats = await adherenceForPatient(patientId, from, to);
    assert.equal(stats.total, 4);
    assert.equal(stats.taken, 2); // DISPENSED and CONFIRMED
    assert.equal(stats.missed, 1);
    assert.equal(stats.delayed, 1); // delayMinutes > 15
    // Denominator excludes SCHEDULED (so 3 completed/missed events), 2 taken / 3 = 66.7%
    assert.equal(stats.ratePct, 66.7);
  });

  test("todayMedicationProgress counts completed vs total events", async () => {
    const patientId = "patient-progress-test";
    const now = new Date();
    const scheduledAt = new Date(now);

    await prisma.medicationEvent.deleteMany({ where: { patientId } });

    await prisma.medicationEvent.create({
      data: {
        id: "ME-TODAY-001",
        patientId,
        planId: "plan-today-1",
        scheduledAt,
        state: "DISPENSED",
      },
    });

    await prisma.medicationEvent.create({
      data: {
        id: "ME-TODAY-002",
        patientId,
        planId: "plan-today-2",
        scheduledAt,
        state: "DUE",
      },
    });

    const progress = await todayMedicationProgress(patientId);
    assert.equal(progress.completed, 1);
    assert.equal(progress.total, 2);
  });
});
