import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { prisma } from "@/lib/db";
import { assertPatientAccess, canManageMedicationPlans, ForbiddenError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { advanceMedicationEvents } from "@/lib/engines/medicationEvents";

export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req);
    if (errorResponse) {
      return errorResponse;
    }
    if (!canManageMedicationPlans(user)) {
      return NextResponse.json({ error: "Medication plans require doctor authorization." }, { status: 403 });
    }

    let patientId = "";
    let medicine = "";
    let dosage = "";
    let frequency = "";
    let scheduledTime = "";
    let startDate = "";
    let endDate: string | null = null;
    let mealRelationship = "NO_MEAL_DEPENDENCY";
    let mealKind: string | null = null;
    let deviceSlot = 1;
    let instructions = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      patientId = String(body.patientId ?? "");
      medicine = String(body.medicine ?? "");
      dosage = String(body.dosage ?? "");
      frequency = String(body.frequency ?? "");
      scheduledTime = String(body.scheduledTime ?? "");
      startDate = String(body.startDate ?? "");
      endDate = body.endDate ? String(body.endDate) : null;
      mealRelationship = String(body.mealRelationship ?? "NO_MEAL_DEPENDENCY");
      mealKind = body.mealKind ? String(body.mealKind) : null;
      deviceSlot = Number(body.deviceSlot ?? 1);
      instructions = String(body.instructions ?? "");
    } else {
      const formData = await req.formData();
      patientId = String(formData.get("patientId") ?? "");
      medicine = String(formData.get("medicine") ?? "");
      dosage = String(formData.get("dosage") ?? "");
      frequency = String(formData.get("frequency") ?? "");
      scheduledTime = String(formData.get("scheduledTime") ?? "");
      startDate = String(formData.get("startDate") ?? "");
      endDate = formData.get("endDate") ? String(formData.get("endDate")) : null;
      mealRelationship = String(formData.get("mealRelationship") ?? "NO_MEAL_DEPENDENCY");
      mealKind = formData.get("mealKind") ? String(formData.get("mealKind")) : null;
      deviceSlot = Number(formData.get("deviceSlot") ?? 1);
      instructions = String(formData.get("instructions") ?? "");
    }

    if (!patientId || !medicine || !dosage || !frequency || !scheduledTime || !startDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await assertPatientAccess(user, patientId);

    let medication = await prisma.medication.findFirst({ where: { name: medicine } });
    if (!medication) {
      medication = await prisma.medication.create({
        data: { name: medicine, form: "tablet", strength: dosage },
      });
    }

    const plan = await prisma.medicationPlan.create({
      data: {
        patientId,
        medicationId: medication.id,
        dosage,
        frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        scheduledTime,
        mealRelationship,
        mealKind: mealKind || null,
        instructions,
        deviceSlot,
        authorizedBy: user.id,
        status: "ACTIVE",
      },
    });

    await writeAudit({
      user,
      patientId,
      action: "Medication plan created",
      newValue: JSON.stringify({ medicine, time: plan.scheduledTime }),
    });

    await advanceMedicationEvents();

    return NextResponse.json({ ok: true, planId: plan.id });
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
