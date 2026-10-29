import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { prisma } from "@/lib/db";
import { assertPatientAccess, ForbiddenError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { mealUnlocksMedication } from "@/lib/engines/mealAware";
import { advanceMedicationEvents } from "@/lib/engines/medicationEvents";

export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    let patientId = "";
    let kind = "";
    let eventType = "";
    let source = "caregiver";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      patientId = String(body.patientId ?? "");
      kind = String(body.kind ?? "");
      eventType = String(body.eventType ?? "");
      source = String(body.source ?? "caregiver");
    } else {
      const formData = await req.formData();
      patientId = String(formData.get("patientId") ?? "");
      kind = String(formData.get("kind") ?? "");
      eventType = String(formData.get("eventType") ?? "");
      source = String(formData.get("source") ?? "caregiver");
    }

    if (!patientId || !kind || !eventType) {
      return NextResponse.json({ error: "patientId, kind, and eventType are required" }, { status: 400 });
    }

    await assertPatientAccess(user, patientId);

    const occurredAt = new Date();
    await prisma.mealEvent.create({
      data: { patientId, kind, eventType, source, occurredAt },
    });

    await prisma.timelineEvent.create({
      data: {
        patientId,
        occurredAt,
        title:
          eventType === "SENSOR_DETECTED"
            ? `${kind.toLowerCase()} sensor-detected (unverified)`
            : `${kind.charAt(0) + kind.slice(1).toLowerCase()} recorded`,
        detail: `${eventType} via ${source}. Sensor-only events do not unlock after-meal doses.`,
        source,
      },
    });

    await writeAudit({
      user,
      patientId,
      action: "Meal event recorded",
      newValue: `${kind} ${eventType}`,
    });

    if (mealUnlocksMedication(eventType)) {
      await advanceMedicationEvents();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
