import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publish, topic } from "@/lib/gateway/mqtt";

export async function POST(req: Request) {
  const body = await req.json();
  const device = await prisma.device.findUnique({ where: { serial: String(body.serial ?? "") } });
  if (!device) return NextResponse.json({ error: "Unknown device" }, { status: 404 });
  await prisma.device.update({
    where: { id: device.id },
    data: {
      online: true,
      batteryPct: Number(body.batteryPct ?? device.batteryPct),
      lastSeenAt: new Date(),
    },
  });
  publish(topic(device.id, "telemetry"), {
    batteryPct: body.batteryPct,
    rssi: body.rssi,
  });
  return NextResponse.json({ ok: true });
}
