import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { pressConfirmButton } from "@/lib/simulator";

export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    let deviceId = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      deviceId = String(body.deviceId ?? "");
    } else {
      const formData = await req.formData();
      deviceId = String(formData.get("deviceId") ?? "");
    }

    if (!deviceId) {
      return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
    }

    const eventId = await pressConfirmButton(deviceId);
    return NextResponse.json({ ok: true, eventId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
