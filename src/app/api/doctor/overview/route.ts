import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { doctorOverview } from "@/lib/queries";

export async function GET(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req, ["DOCTOR", "ADMIN"]);
    if (errorResponse) {
      return errorResponse;
    }

    const rows = await doctorOverview(user);
    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
