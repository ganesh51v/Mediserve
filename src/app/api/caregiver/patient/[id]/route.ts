import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { patientProfile } from "@/lib/queries";
import { assertPatientAccess, ForbiddenError } from "@/lib/rbac";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req, ["CAREGIVER", "ADMIN"]);
    if (errorResponse) {
      return errorResponse;
    }

    const { id } = await params;
    await assertPatientAccess(user, id);

    const data = await patientProfile(user, id);
    if (!data) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json(data);
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
