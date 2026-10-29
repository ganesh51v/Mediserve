import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { caregiverDashboard } from "@/lib/queries";

export async function GET(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req, ["CAREGIVER", "ADMIN"]);
    if (errorResponse) {
      return errorResponse;
    }

    const data = await caregiverDashboard(user);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
