import { prisma } from "./db";
import { publish, topic } from "./gateway/mqtt";
import { transitionEvent } from "./engines/medicationEvents";
import { writeAudit } from "./audit";

export async function tickSimulator(deviceId?: string) {
  const devices = await prisma.device.findMany({
    where: deviceId ? { id: deviceId } : {},
    include: { slots: true },
  });

  for (const device of devices) {
    if (device.simState === "OFFLINE") {
      await prisma.device.update({
        where: { id: device.id },
        data: { online: false },
      });
      publish(topic(device.id, "status"), { online: false, state: "OFFLINE" });
      continue;
    }

    const drain = device.simState === "LOW_BATTERY" ? 2 : 0;
    const batteryPct = Math.max(5, device.batteryPct - drain);
    await prisma.device.update({
      where: { id: device.id },
      data: {
        online: true,
        batteryPct,
        lastSeenAt: new Date(),
        motor: device.simState === "JAMMED" ? "Jammed" : "Ready",
        sensors: device.simState === "SENSOR_ERROR" ? "Fault" : "Normal",
      },
    });
    await prisma.deviceTelemetry.create({
      data: {
        deviceId: device.id,
        batteryPct,
        wifiRssi: device.wifiQuality === "Good" ? -45 : -78,
        online: true,
      },
    });
    publish(topic(device.id, "telemetry"), {
      batteryPct,
      wifi: device.wifiQuality,
      door: device.door,
      motor: device.simState === "JAMMED" ? "Jammed" : "Ready",
    });

    if (["JAMMED", "SENSOR_ERROR", "LOW_STOCK", "LOW_BATTERY"].includes(device.simState)) {
      publish(topic(device.id, "error"), { state: device.simState });
    }

    if (device.simState === "READY" || device.simState === "ONLINE" || device.simState === "DISPENSED") {
      const pending = await prisma.medicationEvent.findFirst({
        where: {
          patientId: device.patientId ?? "",
          state: { in: ["NOTIFIED", "ELIGIBLE"] },
        },
        include: { plan: true },
        orderBy: { scheduledAt: "asc" },
      });
      if (pending) {
        await runDispenseCycle(device.id, pending.id, pending.plan.deviceSlot);
      }
    }
  }
}

export async function runDispenseCycle(deviceId: string, eventId: string, slotIndex: number) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: { slots: true },
  });
  if (!device) return;
  if (!device.online || device.simState === "OFFLINE") return;

  const slot = device.slots.find((s: any) => s.slotIndex === slotIndex);
  if (!slot || slot.stock === "EMPTY" || slot.count <= 0) {
    await transitionEvent(eventId, "FAILED", { failedReason: "Slot empty or unavailable" });
    publish(topic(deviceId, "error"), { eventId, error: "EMPTY_SLOT" });
    return;
  }
  if (device.simState === "JAMMED") {
    await transitionEvent(eventId, "FAILED", { failedReason: "Motor jam" });
    publish(topic(deviceId, "error"), { eventId, error: "JAM" });
    return;
  }
  if (device.simState === "SENSOR_ERROR") {
    await transitionEvent(eventId, "FAILED", { failedReason: "Sensor verification failed" });
    publish(topic(deviceId, "error"), { eventId, error: "SENSOR" });
    return;
  }

  await prisma.device.update({ where: { id: deviceId }, data: { simState: "DISPENSING", motor: "Busy" } });
  await transitionEvent(eventId, "DISPENSING");
  publish(topic(deviceId, "event"), { eventId, state: "DISPENSING", slot: slotIndex });

  const event = await prisma.medicationEvent.findUnique({ where: { id: eventId } });
  const delay = event
    ? Math.max(0, Math.round((Date.now() - event.scheduledAt.getTime()) / 60000))
    : 0;

  const newCount = slot.count - 1;
  const stock = newCount <= 0 ? "EMPTY" : newCount <= 3 ? "LOW" : "GOOD";
  await prisma.deviceSlot.update({
    where: { id: slot.id },
    data: { count: newCount, stock },
  });

  await prisma.dispensingEvent.create({
    data: {
      deviceId,
      medicationEventId: eventId,
      slotIndex,
      result: "OK",
      sensorVerified: true,
    },
  });

  await transitionEvent(eventId, "DISPENSED", {
    dispensedAt: new Date(),
    delayMinutes: delay,
    deviceId,
  });
  await prisma.medicationEvent.update({
    where: { id: eventId },
    data: { state: "CONFIRMED", confirmedAt: new Date() },
  });

  if (event?.patientId) {
    await prisma.timelineEvent.create({
      data: {
        patientId: event.patientId,
        occurredAt: new Date(),
        title: "Medication dispensed",
        detail: `${eventId} slot ${slotIndex}`,
        source: "dispenser",
      },
    });
    await prisma.timelineEvent.create({
      data: {
        patientId: event.patientId,
        occurredAt: new Date(),
        title: "Medication confirmation received",
        detail: `${eventId} physical button / collection sensor`,
        source: "dispenser",
      },
    });
  }

  await prisma.device.update({
    where: { id: deviceId },
    data: { simState: "DISPENSED", motor: "Ready" },
  });
  publish(topic(deviceId, "event"), { eventId, state: "CONFIRMED", slot: slotIndex });
  await writeAudit({
    action: "Dispense cycle completed",
    patientId: event?.patientId,
    deviceId,
    newValue: eventId,
  });
}

export async function setSimulatorState(deviceId: string, simState: string) {
  const patch: Record<string, unknown> = { simState };
  if (simState === "OFFLINE") patch.online = false;
  else patch.online = true;
  if (simState === "LOW_BATTERY") patch.batteryPct = 12;
  if (simState === "JAMMED") patch.motor = "Jammed";
  if (simState === "SENSOR_ERROR") patch.sensors = "Fault";
  if (simState === "READY" || simState === "ONLINE") {
    patch.motor = "Ready";
    patch.sensors = "Normal";
  }
  await prisma.device.update({ where: { id: deviceId }, data: patch });
  publish(topic(deviceId, "status"), { state: simState });
}

export async function pressConfirmButton(deviceId: string) {
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  const pending = await prisma.medicationEvent.findFirst({
    where: {
      patientId: device?.patientId ?? "",
      state: { in: ["NOTIFIED", "ELIGIBLE", "DISPENSING", "DISPENSED"] },
    },
    include: { plan: true },
    orderBy: { scheduledAt: "asc" },
  });
  if (!pending || !device) return null;
  if (pending.state !== "DISPENSED" && pending.state !== "CONFIRMED") {
    await runDispenseCycle(deviceId, pending.id, pending.plan.deviceSlot);
  } else {
    await prisma.medicationEvent.update({
      where: { id: pending.id },
      data: { state: "CONFIRMED", confirmedAt: new Date() },
    });
  }
  return pending.id;
}
