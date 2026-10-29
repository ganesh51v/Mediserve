import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publish, topic } from "@/lib/gateway/mqtt";
import { transitionEvent } from "@/lib/engines/medicationEvents";

export async function POST(req: Request) {
  const body = await req.json();
  const serial = String(body.serial ?? "");
  const eventId = String(body.eventId ?? "");
  const result = String(body.result ?? "OK");
  const device = await prisma.device.findUnique({ where: { serial } });
  if (!device) return NextResponse.json({ error: "Unknown device" }, { status: 404 });

  publish(topic(device.id, "event"), { eventId, result, slot: body.slot });
  if (result === "OK") {
    await transitionEvent(eventId, "DISPENSED", { dispensedAt: new Date(), deviceId: device.id });
  } else {
    await transitionEvent(eventId, "FAILED", { failedReason: result, deviceId: device.id });
  }
  await prisma.device.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date(), online: true },
  });
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const serial = searchParams.get("serial");
  if (!serial) return NextResponse.json({ error: "serial required" }, { status: 400 });
  const device = await prisma.device.findUnique({ where: { serial } });
  if (!device) return NextResponse.json({ error: "Unknown device" }, { status: 404 });
  const pending = await prisma.medicationEvent.findFirst({
    where: { patientId: device.patientId ?? "", state: { in: ["ELIGIBLE", "NOTIFIED"] } },
    include: { plan: { include: { medication: true } } },
    orderBy: { scheduledAt: "asc" },
  });
  return NextResponse.json({
    deviceId: device.id,
    command: pending
      ? {
          type: "DISPENSE",
          eventId: pending.id,
          slot: pending.plan.deviceSlot,
          display: pending.plan.medication.name,
        }
      : null,
  });
}
