import { prisma } from "./db";
import { advanceMedicationEvents } from "./engines/medicationEvents";
import { evaluateAlerts } from "./engines/alerts";
import { assignedPatientIds } from "./rbac";
import type { SessionUser } from "./auth";
import { startOfDay, endOfDay } from "./constants";
import { adherenceForPatient, todayMedicationProgress } from "./engines/adherence";

export async function runEngines() {
  await advanceMedicationEvents();
  await evaluateAlerts();
}

export async function caregiverDashboard(user: SessionUser) {
  await runEngines();
  const ids = await assignedPatientIds(user);
  const patients = await prisma.patient.findMany({
    where: { id: { in: ids } },
    include: {
      assignments: { include: { doctor: { include: { user: true } }, caregiver: { include: { user: true } } } },
      alerts: { where: { acknowledged: false }, orderBy: { createdAt: "desc" } },
      devices: { include: { slots: true } },
    },
  });

  const rows = [];
  let missedToday = 0;
  let eventsToday = 0;
  let deviceProblems = 0;
  for (const p of patients) {
    const progress = await todayMedicationProgress(p.id);
    eventsToday += progress.total;
    missedToday += progress.missed;
    const device = p.devices[0];
    if (device && (!device.online || ["JAMMED", "SENSOR_ERROR", "LOW_BATTERY", "OFFLINE"].includes(device.simState))) {
      deviceProblems += 1;
    }
    const attention =
      progress.ratePct < 80 ||
      p.alerts.some((a: any) => a.priority !== "INFO") ||
      (device && !device.online);
    rows.push({
      patient: p,
      adherence: progress.ratePct,
      attention,
      status: attention ? "Attention" : "Normal",
      progress,
      alerts: p.alerts.length,
    });
  }

  return {
    patients: rows,
    totals: {
      total: rows.length,
      attention: rows.filter((r) => r.attention).length,
      eventsToday,
      missedToday,
      activeAlerts: rows.reduce((n, r) => n + r.alerts, 0),
      deviceProblems,
    },
  };
}

export async function patientProfile(user: SessionUser, patientId: string) {
  await runEngines();
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      assignments: {
        where: { active: true },
        include: { doctor: { include: { user: true } }, caregiver: { include: { user: true } } },
      },
      medicationPlans: { include: { medication: true }, where: { status: "ACTIVE" } },
      medicationEvents: {
        where: { scheduledAt: { gte: startOfDay(), lte: endOfDay() } },
        include: { plan: { include: { medication: true } } },
        orderBy: { scheduledAt: "asc" },
      },
      mealSchedules: true,
      mealEvents: {
        where: { occurredAt: { gte: startOfDay(), lte: endOfDay() } },
        orderBy: { occurredAt: "asc" },
      },
      devices: { include: { slots: true, telemetry: { orderBy: { recordedAt: "desc" }, take: 12 } } },
      alerts: { orderBy: { createdAt: "desc" }, take: 20 },
      healthMeasurements: { orderBy: { recordedAt: "desc" }, take: 20 },
      timelineEvents: { orderBy: { occurredAt: "desc" }, take: 40 },
      clinicalNotes: { include: { doctor: { include: { user: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!patient) return null;
  const progress = await todayMedicationProgress(patientId);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const week = await adherenceForPatient(patientId, weekAgo, endOfDay());
  return { patient, progress, week };
}

export async function doctorOverview(user: SessionUser) {
  await runEngines();
  const ids = await assignedPatientIds(user);
  const patients = await prisma.patient.findMany({
    where: { id: { in: ids } },
    include: { alerts: { where: { acknowledged: false } } },
  });
  const overviews = [];
  for (const p of patients) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const stats = await adherenceForPatient(p.id, weekAgo, endOfDay());
    overviews.push({
      patient: p,
      adherence: stats.ratePct,
      missed: stats.missed,
      delayed: stats.delayed,
      events: stats.total,
      alerts: p.alerts.length,
    });
  }
  return overviews;
}

export async function reportBundle(patientId: string) {
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const med = await adherenceForPatient(patientId, from, endOfDay());
  const measurements = await prisma.healthMeasurement.findMany({
    where: { patientId, recordedAt: { gte: from } },
    orderBy: { recordedAt: "desc" },
  });
  const alerts = await prisma.alert.findMany({
    where: { patientId, createdAt: { gte: from } },
    orderBy: { createdAt: "desc" },
  });
  const device = await prisma.device.findFirst({
    where: { patientId },
    include: { telemetry: { where: { recordedAt: { gte: from } }, orderBy: { recordedAt: "desc" } }, deviceEvents: true },
  });
  const dispensing = await prisma.dispensingEvent.findMany({
    where: { medicationEvent: { patientId } },
    include: { medicationEvent: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return { med, measurements, alerts, device, dispensing };
}
