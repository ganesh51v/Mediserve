import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req, ["ADMIN"]);
    if (errorResponse) {
      return errorResponse;
    }

    const logs = await prisma.auditLog.findMany({
      include: { user: true, patient: true },
      orderBy: { timestamp: "desc" },
      take: 80,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
