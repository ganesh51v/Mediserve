import { prisma } from "../db";

const UNLOCKING_MEAL_TYPES = new Set(["REPORTED", "CONFIRMED"]);

export function mealUnlocksMedication(eventType: string) {
  return UNLOCKING_MEAL_TYPES.has(eventType);
}

export async function latestMeal(patientId: string, kind?: string | null) {
  return prisma.mealEvent.findFirst({
    where: {
      patientId,
      ...(kind ? { kind } : {}),
    },
    orderBy: { occurredAt: "desc" },
  });
}

export async function mealToday(patientId: string, kind: string, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return prisma.mealEvent.findMany({
    where: { patientId, kind, occurredAt: { gte: start, lte: end } },
    orderBy: { occurredAt: "asc" },
  });
}

export async function hasVerifiedMealSince(
  patientId: string,
  kind: string | null | undefined,
  since: Date,
  until: Date,
) {
  const found = await prisma.mealEvent.findFirst({
    where: {
      patientId,
      occurredAt: { gte: since, lte: until },
      eventType: { in: ["REPORTED", "CONFIRMED"] },
      ...(kind ? { kind } : {}),
    },
  });
  return Boolean(found);
}

export async function hasVerifiedMealInWindow(patientId: string, hours: number, now = new Date()) {
  const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const found = await prisma.mealEvent.findFirst({
    where: {
      patientId,
      occurredAt: { gte: since, lte: now },
      eventType: { in: ["REPORTED", "CONFIRMED"] },
    },
  });
  return Boolean(found);
}

/**
 * Deterministic eligibility. Does not infer clinical instructions.
 * Sensor-detected meals never unlock medication by themselves.
 */
export async function evaluateEligibility(opts: {
  patientId: string;
  mealRelationship: string;
  mealKind?: string | null;
  scheduledAt: Date;
  now?: Date;
}): Promise<{ eligible: boolean; reason: string }> {
  const now = opts.now ?? new Date();
  if (now < opts.scheduledAt) {
    return { eligible: false, reason: "Before scheduled time" };
  }

  const rel = opts.mealRelationship;

  if (rel === "NO_MEAL_DEPENDENCY") {
    return { eligible: true, reason: "No meal dependency" };
  }

  if (rel === "EMPTY_STOMACH") {
    const recent = await hasVerifiedMealInWindow(opts.patientId, 4, now);
    if (recent) return { eligible: false, reason: "Verified meal within last 4 hours" };
    return { eligible: true, reason: "No verified meal in last 4 hours" };
  }

  const dayStart = new Date(opts.scheduledAt);
  dayStart.setHours(0, 0, 0, 0);

  if (rel === "AFTER_MEAL") {
    const ok = await hasVerifiedMealSince(opts.patientId, opts.mealKind, dayStart, now);
    if (!ok) {
      return {
        eligible: false,
        reason: "Waiting for verified meal (reported or confirmed). Sensor-only events do not unlock.",
      };
    }
    return { eligible: true, reason: "Verified meal recorded" };
  }

  if (rel === "WITH_MEAL") {
    const ok = await hasVerifiedMealSince(opts.patientId, opts.mealKind, dayStart, now);
    if (!ok) {
      return {
        eligible: false,
        reason: "Waiting for verified meal to take with medication",
      };
    }
    return { eligible: true, reason: "Verified meal recorded for with-meal dose" };
  }

  if (rel === "BEFORE_MEAL") {
    const meal = await prisma.mealEvent.findFirst({
      where: {
        patientId: opts.patientId,
        eventType: { in: ["REPORTED", "CONFIRMED"] },
        occurredAt: { gte: dayStart, lte: now },
        ...(opts.mealKind ? { kind: opts.mealKind } : {}),
      },
    });
    if (meal && meal.occurredAt > opts.scheduledAt) {
      return { eligible: false, reason: "Verified meal already recorded; before-meal window closed" };
    }
    return { eligible: true, reason: "Before-meal window open" };
  }

  return { eligible: false, reason: "Unknown meal relationship" };
}
