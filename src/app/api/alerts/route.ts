import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { prisma } from "@/lib/db";
import { assignedPatientIds } from "@/lib/rbac";
import { runEngines } from "@/lib/queries";

export async function GET(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    await runEngines();
    const ids = await assignedPatientIds(user);
    const alerts = await prisma.alert.findMany({
      where: user.role === "ADMIN" ? {} : { patientId: { in: ids } },
      include: { patient: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ alerts, notifications });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
