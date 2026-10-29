import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { prisma } from "@/lib/db";
import { assignedPatientIds } from "@/lib/rbac";
import { reportBundle } from "@/lib/queries";

export async function GET(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const ids = await assignedPatientIds(user);
    const patients = await prisma.patient.findMany({
      where: user.role === "ADMIN" ? {} : { id: { in: ids } },
    });

    const bundles = [];
    for (const p of patients) {
      bundles.push({ patient: p, report: await reportBundle(p.id) });
    }

    return NextResponse.json({ bundles });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
