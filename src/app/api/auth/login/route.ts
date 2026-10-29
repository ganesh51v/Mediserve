import { NextResponse } from "next/server";
import { login, homeFor } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    let email = "";
    let password = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      email = String(body.email ?? "");
      password = String(body.password ?? "");
    } else if (contentType.includes("form")) {
      const formData = await req.formData();
      email = String(formData.get("email") ?? "");
      password = String(formData.get("password") ?? "");
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const result = await login(email, password);
    if (!result) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const { session, token } = result;

    return NextResponse.json({
      ok: true,
      user: session,
      token,
      redirect: homeFor(session.role),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
