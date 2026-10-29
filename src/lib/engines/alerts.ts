import { prisma } from "../db";

export async function raiseAlert(opts: {
  patientId: string;
  category: "MEDICATION" | "DEVICE" | "HEALTH";
  priority: "INFO" | "WARNING" | "URGENT";
  title: string;
  body: string;
}) {
  const dup = await prisma.alert.findFirst({
    where: {
      patientId: opts.patientId,
      title: opts.title,
      acknowledged: false,
      createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
    },
  });
  if (dup) return dup;

  const alert = await prisma.alert.create({
    data: {
      patientId: opts.patientId,
      category: opts.category,
      priority: opts.priority,
      title: opts.title,
      body: opts.body,
      isDiagnosis: false,
    },
  });

  const assignments = await prisma.patientAssignment.findMany({
    where: { patientId: opts.patientId, active: true },
    include: { doctor: { include: { user: true } }, caregiver: { include: { user: true } } },
  });
  const userIds = new Set<string>();
  for (const a of assignments) {
    if (a.doctor?.userId) userIds.add(a.doctor.userId);
    if (a.caregiver?.userId) userIds.add(a.caregiver.userId);
  }
  for (const userId of userIds) {
    await prisma.notification.createMany({
      data: [
        { userId, channel: "PUSH", title: opts.title, body: opts.body },
        { userId, channel: "EMAIL", title: opts.title, body: opts.body },
      ],
    });
  }
  return alert;
}

export async function evaluateAlerts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const missed = await prisma.medicationEvent.findMany({
    where: { state: "MISSED", scheduledAt: { gte: today } },
    include: { plan: { include: { medication: true } }, patient: true },
  });
  for (const m of missed) {
    await raiseAlert({
      patientId: m.patientId,
      category: "MEDICATION",
      priority: "WARNING",
      title: "Medication missed",
      body: `Patient: ${m.patient.name}\nMedicine: ${m.plan.medication.name}\nScheduled: ${m.scheduledAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}\nEvent: ${m.id}`,
    });
  }

  const failed = await prisma.medicationEvent.findMany({
    where: { state: "FAILED", scheduledAt: { gte: today } },
    include: { patient: true, plan: { include: { medication: true } } },
  });
  for (const f of failed) {
    await raiseAlert({
      patientId: f.patientId,
      category: "MEDICATION",
      priority: "URGENT",
      title: "Dispensing failure",
      body: `Patient: ${f.patient.name}\nMedicine: ${f.plan.medication.name}\nEvent: ${f.id}\n${f.failedReason ?? ""}`,
    });
  }

  const devices = await prisma.device.findMany({ include: { slots: true } });
  for (const d of devices) {
    if (!d.patientId) continue;
    if (!d.online || d.simState === "OFFLINE") {
      await raiseAlert({
        patientId: d.patientId,
        category: "DEVICE",
        priority: "URGENT",
        title: "Device offline",
        body: `Dispenser ${d.serial} is offline. This is a device monitoring signal.`,
      });
    }
    if (d.batteryPct < 20 || d.simState === "LOW_BATTERY") {
      await raiseAlert({
        patientId: d.patientId,
        category: "DEVICE",
        priority: "WARNING",
        title: "Low battery",
        body: `Dispenser ${d.serial} battery is ${d.batteryPct}%.`,
      });
    }
    if (d.simState === "JAMMED") {
      await raiseAlert({
        patientId: d.patientId,
        category: "DEVICE",
        priority: "URGENT",
        title: "Motor jam",
        body: `Dispenser ${d.serial} reports a motor jam.`,
      });
    }
    if (d.simState === "SENSOR_ERROR") {
      await raiseAlert({
        patientId: d.patientId,
        category: "DEVICE",
        priority: "WARNING",
        title: "Sensor failure",
        body: `Dispenser ${d.serial} reports a sensor fault.`,
      });
    }
    if (d.door === "Open") {
      await raiseAlert({
        patientId: d.patientId,
        category: "DEVICE",
        priority: "WARNING",
        title: "Door opened",
        body: `Dispenser ${d.serial} door is open.`,
      });
    }
    for (const slot of d.slots) {
      if (slot.stock === "LOW" || slot.stock === "EMPTY") {
        await raiseAlert({
          patientId: d.patientId,
          category: "DEVICE",
          priority: slot.stock === "EMPTY" ? "URGENT" : "WARNING",
          title: "Low medication",
          body: `Dispenser ${d.serial} slot ${slot.slotIndex} is ${slot.stock.toLowerCase()}.`,
        });
      }
    }
  }

  const measurements = await prisma.healthMeasurement.findMany({
    where: { status: "REQUIRES_REVIEW", recordedAt: { gte: today } },
    include: { patient: true },
  });
  for (const h of measurements) {
    await raiseAlert({
      patientId: h.patientId,
      category: "HEALTH",
      priority: "WARNING",
      title: "Health measurement requires review",
      body: `Patient: ${h.patient.name}\n${h.type}: ${h.value} ${h.unit}\nSource: ${h.source}\nThis is a monitoring signal, not a diagnosis.`,
    });
  }
}
