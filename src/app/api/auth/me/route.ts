import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getSession(req);
    return NextResponse.json({ user: user ?? null });
  } catch (err) {
    return NextResponse.json({ user: null });
  }
}
