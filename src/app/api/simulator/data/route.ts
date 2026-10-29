import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { prisma } from "@/lib/db";
import { recentMessages } from "@/lib/gateway/mqtt";

export async function GET(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const devices = await prisma.device.findMany({
      include: { patient: true, slots: true },
      orderBy: { serial: "asc" },
    });

    const pending = await prisma.medicationEvent.findMany({
      where: { state: { in: ["ELIGIBLE", "NOTIFIED", "DISPENSING"] } },
      include: { plan: { include: { medication: true } }, patient: true },
    });

    const messagesByDevice: Record<string, ReturnType<typeof recentMessages>> = {};
    for (const d of devices) {
      messagesByDevice[d.id] = recentMessages(d.id);
    }

    return NextResponse.json({ devices, pending, messagesByDevice });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
