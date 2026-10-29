import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req, ["ADMIN"]);
    if (errorResponse) {
      return errorResponse;
    }

    const devices = await prisma.device.findMany({ include: { patient: true, slots: true } });
    return NextResponse.json({ devices });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req, ["ADMIN"]);
    if (errorResponse) {
      return errorResponse;
    }

    let serial = "";
    let patientId: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      serial = String(body.serial ?? "");
      patientId = body.patientId ? String(body.patientId) : null;
    } else {
      const formData = await req.formData();
      serial = String(formData.get("serial") ?? "");
      patientId = formData.get("patientId") ? String(formData.get("patientId")) : null;
    }

    if (!serial) {
      return NextResponse.json({ error: "serial is required" }, { status: 400 });
    }

    const device = await prisma.device.create({
      data: {
        serial,
        patientId,
        simState: "ONLINE",
        slots: {
          create: [1, 2, 3, 4].map((slotIndex) => ({
            slotIndex,
            stock: "GOOD",
            count: 10,
          })),
        },
      },
    });

    await writeAudit({
      user,
      action: "Device registered",
      deviceId: device.id,
      newValue: serial,
      patientId: patientId ?? undefined,
    });

    return NextResponse.json({ ok: true, deviceId: device.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
