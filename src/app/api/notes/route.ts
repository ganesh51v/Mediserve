import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { prisma } from "@/lib/db";
import { assertPatientAccess, ForbiddenError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req, ["DOCTOR", "ADMIN"]);
    if (errorResponse) {
      return errorResponse;
    }

    let patientId = "";
    let body = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await req.json();
      patientId = String(json.patientId ?? "");
      body = String(json.body ?? "");
    } else {
      const formData = await req.formData();
      patientId = String(formData.get("patientId") ?? "");
      body = String(formData.get("body") ?? "");
    }

    if (!patientId || !body) {
      return NextResponse.json({ error: "patientId and body are required" }, { status: 400 });
    }

    await assertPatientAccess(user, patientId);

    const doctorId =
      user.doctorId ??
      (await prisma.doctor.findFirst({ where: { userId: user.id } }))?.id;

    if (!doctorId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Doctor profile required" }, { status: 400 });
    }

    // If admin has no doctor profile, fallback or use system doctor
    const finalDoctorId = doctorId ?? (await prisma.doctor.findFirst())?.id;
    if (!finalDoctorId) {
      return NextResponse.json({ error: "Doctor profile required" }, { status: 400 });
    }

    const note = await prisma.clinicalNote.create({
      data: { patientId, doctorId: finalDoctorId, body },
    });

    await writeAudit({ user, patientId, action: "Clinical instruction added" });

    return NextResponse.json({ ok: true, noteId: note.id });
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
