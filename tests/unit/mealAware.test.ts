import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  mealUnlocksMedication,
  evaluateEligibility,
} from "../../src/lib/engines/mealAware";
import { prisma } from "../../src/lib/db";

describe("mealAware eligibility rules", () => {
  test("mealUnlocksMedication only returns true for REPORTED and CONFIRMED", () => {
    assert.equal(mealUnlocksMedication("REPORTED"), true);
    assert.equal(mealUnlocksMedication("CONFIRMED"), true);
    assert.equal(mealUnlocksMedication("SENSOR_DETECTED"), false);
    assert.equal(mealUnlocksMedication("SCHEDULED"), false);
    assert.equal(mealUnlocksMedication("UNKNOWN"), false);
  });

  test("evaluateEligibility returns false if now is before scheduledAt", async () => {
    const scheduledAt = new Date("2026-05-10T10:00:00Z");
    const now = new Date("2026-05-10T09:59:00Z");
    const result = await evaluateEligibility({
      patientId: "patient-test-1",
      mealRelationship: "NO_MEAL_DEPENDENCY",
      scheduledAt,
      now,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "Before scheduled time");
  });

  test("NO_MEAL_DEPENDENCY is eligible immediately once scheduled time arrives", async () => {
    const scheduledAt = new Date("2026-05-10T10:00:00Z");
    const now = new Date("2026-05-10T10:05:00Z");
    const result = await evaluateEligibility({
      patientId: "patient-test-1",
      mealRelationship: "NO_MEAL_DEPENDENCY",
      scheduledAt,
      now,
    });
    assert.equal(result.eligible, true);
    assert.equal(result.reason, "No meal dependency");
  });

  test("EMPTY_STOMACH is eligible only when no verified meal within last 4 hours", async () => {
    const patientId = "patient-empty-stomach";
    const now = new Date("2026-05-10T14:00:00Z");
    const scheduledAt = new Date("2026-05-10T12:00:00Z");

    // Initially no meals -> eligible
    let result = await evaluateEligibility({
      patientId,
      mealRelationship: "EMPTY_STOMACH",
      scheduledAt,
      now,
    });
    assert.equal(result.eligible, true);
    assert.equal(result.reason, "No verified meal in last 4 hours");

    // Add a verified meal 2 hours ago -> ineligible
    await prisma.mealEvent.create({
      data: {
        patientId,
        kind: "LUNCH",
        eventType: "CONFIRMED",
        occurredAt: new Date("2026-05-10T12:00:00Z"),
        source: "caregiver",
      },
    });

    result = await evaluateEligibility({
      patientId,
      mealRelationship: "EMPTY_STOMACH",
      scheduledAt,
      now,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "Verified meal within last 4 hours");
  });

  test("AFTER_MEAL requires verified meal; SENSOR_DETECTED does NOT unlock", async () => {
    const patientId = "patient-after-meal-test";
    const scheduledAt = new Date("2026-05-10T08:00:00Z");
    const now = new Date("2026-05-10T08:30:00Z");

    // 1. No meals -> ineligible
    let result = await evaluateEligibility({
      patientId,
      mealRelationship: "AFTER_MEAL",
      mealKind: "BREAKFAST",
      scheduledAt,
      now,
    });
    assert.equal(result.eligible, false);
    assert.match(result.reason, /Waiting for verified meal/);

    // 2. Sensor detected meal -> STILL ineligible!
    await prisma.mealEvent.create({
      data: {
        patientId,
        kind: "BREAKFAST",
        eventType: "SENSOR_DETECTED",
        occurredAt: new Date("2026-05-10T08:15:00Z"),
        source: "device",
      },
    });

    result = await evaluateEligibility({
      patientId,
      mealRelationship: "AFTER_MEAL",
      mealKind: "BREAKFAST",
      scheduledAt,
      now,
    });
    assert.equal(result.eligible, false);
    assert.match(result.reason, /Sensor-only events do not unlock/);

    // 3. Caregiver confirms / reports meal -> now eligible!
    await prisma.mealEvent.create({
      data: {
        patientId,
        kind: "BREAKFAST",
        eventType: "REPORTED",
        occurredAt: new Date("2026-05-10T08:20:00Z"),
        source: "caregiver",
      },
    });

    result = await evaluateEligibility({
      patientId,
      mealRelationship: "AFTER_MEAL",
      mealKind: "BREAKFAST",
      scheduledAt,
      now,
    });
    assert.equal(result.eligible, true);
    assert.equal(result.reason, "Verified meal recorded");
  });

  test("WITH_MEAL requires verified meal", async () => {
    const patientId = "patient-with-meal-test";
    const scheduledAt = new Date("2026-05-10T12:00:00Z");
    const now = new Date("2026-05-10T12:30:00Z");

    let result = await evaluateEligibility({
      patientId,
      mealRelationship: "WITH_MEAL",
      scheduledAt,
      now,
    });
    assert.equal(result.eligible, false);

    await prisma.mealEvent.create({
      data: {
        patientId,
        kind: "LUNCH",
        eventType: "CONFIRMED",
        occurredAt: new Date("2026-05-10T12:15:00Z"),
        source: "caregiver",
      },
    });

    result = await evaluateEligibility({
      patientId,
      mealRelationship: "WITH_MEAL",
      scheduledAt,
      now,
    });
    assert.equal(result.eligible, true);
  });

  test("BEFORE_MEAL closes window if verified meal occurred after scheduled time", async () => {
    const patientId = "patient-before-meal-test";
    const scheduledAt = new Date("2026-05-10T07:30:00Z");
    const now = new Date("2026-05-10T08:00:00Z");

    // Before any meal is eaten -> eligible
    let result = await evaluateEligibility({
      patientId,
      mealRelationship: "BEFORE_MEAL",
      mealKind: "BREAKFAST",
      scheduledAt,
      now,
    });
    assert.equal(result.eligible, true);
    assert.equal(result.reason, "Before-meal window open");

    // Meal eaten after scheduled time -> window closed
    await prisma.mealEvent.create({
      data: {
        patientId,
        kind: "BREAKFAST",
        eventType: "CONFIRMED",
        occurredAt: new Date("2026-05-10T07:45:00Z"),
        source: "caregiver",
      },
    });

    result = await evaluateEligibility({
      patientId,
      mealRelationship: "BEFORE_MEAL",
      mealKind: "BREAKFAST",
      scheduledAt,
      now,
    });
    assert.equal(result.eligible, false);
    assert.match(result.reason, /before-meal window closed/);
  });
});
