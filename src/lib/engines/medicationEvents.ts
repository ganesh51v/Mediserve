import { prisma } from "../db";
import { writeAudit } from "../audit";
import { nextMedicationEventId } from "./ids";
import { evaluateEligibility } from "./mealAware";
import { publishCommand } from "../gateway/mqtt";

const OPEN_STATES = ["SCHEDULED", "DUE", "ELIGIBLE", "NOTIFIED", "DISPENSING"];

export async function generateEventsForDate(date = new Date()) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const plans = await prisma.medicationPlan.findMany({
    where: {
      status: "ACTIVE",
      startDate: { lte: new Date(day.getTime() + 86400000) },
      OR: [{ endDate: null }, { endDate: { gte: day } }],
    },
  });

  const created: string[] = [];
  for (const plan of plans) {
    const [hh, mm] = plan.scheduledTime.split(":").map(Number);
    const scheduledAt = new Date(day);
    scheduledAt.setHours(hh, mm, 0, 0);
    if (scheduledAt < plan.startDate) continue;
    if (plan.endDate && scheduledAt > plan.endDate) continue;

    const existing = await prisma.medicationEvent.findFirst({
      where: { planId: plan.id, scheduledAt },
    });
    if (existing) continue;

    const id = await nextMedicationEventId(scheduledAt);
    await prisma.medicationEvent.create({
      data: {
        id,
        patientId: plan.patientId,
        planId: plan.id,
        scheduledAt,
        state: "SCHEDULED",
      },
    });
    await prisma.timelineEvent.create({
      data: {
        patientId: plan.patientId,
        occurredAt: scheduledAt,
        title: "Medication scheduled",
        detail: `${id} scheduled`,
        source: "medication_event_engine",
      },
    });
    created.push(id);
  }
  return created;
}

export async function advanceMedicationEvents(now = new Date()) {
  await generateEventsForDate(now);

  const events = await prisma.medicationEvent.findMany({
    where: { state: { in: OPEN_STATES } },
    include: { plan: true },
  });

  for (const event of events) {
    if (event.state === "SCHEDULED" && now >= event.scheduledAt) {
      await prisma.medicationEvent.update({
        where: { id: event.id },
        data: { state: "DUE" },
      });
      await prisma.timelineEvent.create({
        data: {
          patientId: event.patientId,
          occurredAt: now,
          title: "Medication became due",
          detail: event.id,
          source: "medication_event_engine",
        },
      });
      event.state = "DUE";
    }

    if (event.state === "DUE") {
      const evaln = await evaluateEligibility({
        patientId: event.patientId,
        mealRelationship: event.plan.mealRelationship,
        mealKind: event.plan.mealKind,
        scheduledAt: event.scheduledAt,
        now,
      });
      if (evaln.eligible) {
        await markEligible(event.id, event.patientId, now, evaln.reason);
      }
    }

    if (["DUE", "ELIGIBLE", "NOTIFIED"].includes(event.state)) {
      const graceMs = 2 * 60 * 60 * 1000;
      if (now.getTime() - event.scheduledAt.getTime() > graceMs) {
        await prisma.medicationEvent.update({
          where: { id: event.id },
          data: { state: "MISSED", missedAt: now },
        });
        await prisma.timelineEvent.create({
          data: {
            patientId: event.patientId,
            occurredAt: now,
            title: "Medication missed",
            detail: event.id,
            source: "medication_event_engine",
          },
        });
      }
    }
  }
}

async function markEligible(eventId: string, patientId: string, now: Date, reason: string) {
  const event = await prisma.medicationEvent.update({
    where: { id: eventId },
    data: { state: "ELIGIBLE", eligibleAt: now },
    include: { plan: true },
  });
  await prisma.timelineEvent.create({
    data: {
      patientId,
      occurredAt: now,
      title: "Medication became eligible",
      detail: `${eventId}. ${reason}`,
      source: "meal_aware_engine",
    },
  });
  const device = await prisma.device.findFirst({ where: { patientId } });
  if (device?.online) {
    await prisma.medicationEvent.update({
      where: { id: eventId },
      data: { state: "NOTIFIED", notifiedAt: now, deviceId: device.id },
    });
    await publishCommand(device.id, {
      type: "DISPENSE",
      eventId,
      slot: event.plan.deviceSlot,
    });
  }
}

export async function transitionEvent(
  eventId: string,
  next: string,
  extra: Record<string, unknown> = {},
) {
  const current = await prisma.medicationEvent.findUnique({ where: { id: eventId } });
  if (!current) throw new Error("Unknown medication event");
  const updated = await prisma.medicationEvent.update({
    where: { id: eventId },
    data: { state: next, ...extra },
  });
  await writeAudit({
    action: `Medication event ${current.state} → ${next}`,
    patientId: current.patientId,
    previousValue: current.state,
    newValue: next,
    deviceId: current.deviceId ?? undefined,
  });
  return updated;
}
