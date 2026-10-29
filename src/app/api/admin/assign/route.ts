import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req, ["ADMIN"]);
    if (errorResponse) {
      return errorResponse;
    }

    let patientId = "";
    let doctorId: string | null = null;
    let caregiverId: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      patientId = String(body.patientId ?? "");
      doctorId = body.doctorId ? String(body.doctorId) : null;
      caregiverId = body.caregiverId ? String(body.caregiverId) : null;
    } else {
      const formData = await req.formData();
      patientId = String(formData.get("patientId") ?? "");
      doctorId = formData.get("doctorId") ? String(formData.get("doctorId")) : null;
      caregiverId = formData.get("caregiverId") ? String(formData.get("caregiverId")) : null;
    }

    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const assignment = await prisma.patientAssignment.create({
      data: { patientId, doctorId, caregiverId, active: true },
    });

    await writeAudit({
      user,
      patientId,
      action: "Assignment created",
      newValue: `doctor=${doctorId} caregiver=${caregiverId}`,
    });

    return NextResponse.json({ ok: true, assignmentId: assignment.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
