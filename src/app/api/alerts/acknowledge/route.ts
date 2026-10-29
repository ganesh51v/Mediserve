import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { prisma } from "@/lib/db";
import { assertPatientAccess, ForbiddenError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    let alertId = "";
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await req.json();
      alertId = String(json.alertId ?? "");
    } else {
      const formData = await req.formData();
      alertId = String(formData.get("alertId") ?? "");
    }

    if (!alertId) {
      return NextResponse.json({ error: "alertId is required" }, { status: 400 });
    }

    const alert = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    await assertPatientAccess(user, alert.patientId);
    await prisma.alert.update({
      where: { id: alertId },
      data: { acknowledged: true, acknowledgedById: user.id },
    });

    await writeAudit({
      user,
      patientId: alert.patientId,
      action: "Alert acknowledged",
      newValue: alert.title,
    });

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
