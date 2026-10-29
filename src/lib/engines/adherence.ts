import { prisma } from "../db";
import { startOfDay, endOfDay } from "../constants";

export async function adherenceForPatient(patientId: string, from: Date, to: Date) {
  const events = await prisma.medicationEvent.findMany({
    where: { patientId, scheduledAt: { gte: from, lte: to } },
  });
  const taken = events.filter((e) => ["DISPENSED", "CONFIRMED"].includes(e.state)).length;
  const missed = events.filter((e) => e.state === "MISSED").length;
  const delayed = events.filter((e) => (e.delayMinutes ?? 0) > 15 && ["DISPENSED", "CONFIRMED"].includes(e.state)).length;
  const failed = events.filter((e) => e.state === "FAILED").length;
  const denom = events.filter((e) => e.state !== "CANCELLED" && e.state !== "SCHEDULED").length || events.length;
  const ratePct = denom === 0 ? 100 : Math.round((taken / Math.max(denom, 1)) * 1000) / 10;
  return { taken, missed, delayed, failed, total: events.length, ratePct, events };
}

export async function todayMedicationProgress(patientId: string) {
  const stats = await adherenceForPatient(patientId, startOfDay(), endOfDay());
  const completed = stats.events.filter((e) =>
    ["DISPENSED", "CONFIRMED"].includes(e.state),
  ).length;
  return { ...stats, completed };
}

export async function refreshAdherenceSnapshot(patientId: string) {
  const from = startOfDay();
  const stats = await adherenceForPatient(patientId, from, endOfDay());
  await prisma.adherenceRecord.deleteMany({
    where: { patientId, period: "DAILY", periodStart: from },
  });
  await prisma.adherenceRecord.create({
    data: {
      patientId,
      period: "DAILY",
      periodStart: from,
      taken: stats.taken,
      missed: stats.missed,
      delayed: stats.delayed,
      failed: stats.failed,
      ratePct: stats.ratePct,
    },
  });
  return stats;
}
