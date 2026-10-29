import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { setSimulatorState } from "@/lib/simulator";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req, ["ADMIN", "CAREGIVER"]);
    if (errorResponse) {
      return errorResponse;
    }

    let deviceId = "";
    let state = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      deviceId = String(body.deviceId ?? "");
      state = String(body.state ?? "");
    } else {
      const formData = await req.formData();
      deviceId = String(formData.get("deviceId") ?? "");
      state = String(formData.get("state") ?? "");
    }

    if (!deviceId || !state) {
      return NextResponse.json({ error: "deviceId and state are required" }, { status: 400 });
    }

    await setSimulatorState(deviceId, state);
    await writeAudit({ user, action: "Simulator state changed", deviceId, newValue: state });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
