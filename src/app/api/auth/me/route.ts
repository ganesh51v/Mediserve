import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getSession(req);
  return NextResponse.json({ user });
}
