import { NextResponse } from "next/server";
import { requireClerkAuth } from "@/lib/clerk";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { user, errorResponse } = await requireClerkAuth(req, ["ADMIN"]);
    if (errorResponse) {
      return errorResponse;
    }

    const [patients, doctors, caregivers, devices, users] = await Promise.all([
      prisma.patient.findMany({ include: { assignments: true } }),
      prisma.doctor.findMany({ include: { user: true } }),
      prisma.caregiver.findMany({ include: { user: true } }),
      prisma.device.findMany(),
      prisma.user.findMany(),
    ]);

    return NextResponse.json({ patients, doctors, caregivers, devices, users });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
