import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { tickSimulator } from "@/lib/simulator";

export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req, ["ADMIN", "CAREGIVER", "DOCTOR"]);
    if (errorResponse) {
      return errorResponse;
    }

    let deviceId: string | undefined = undefined;
    try {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await req.json();
        if (body.deviceId) deviceId = String(body.deviceId);
      } else if (contentType.includes("form")) {
        const formData = await req.formData();
        const d = formData.get("deviceId");
        if (d) deviceId = String(d);
      }
    } catch {
      // empty body is fine
    }

    await tickSimulator(deviceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
