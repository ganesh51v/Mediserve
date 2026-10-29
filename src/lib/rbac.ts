import { prisma } from "./db";
import type { SessionUser } from "./auth";

export class ForbiddenError extends Error {
  constructor(message = "FORBIDDEN") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertRole(user: SessionUser, roles: SessionUser["role"][]) {
  if (!roles.includes(user.role)) throw new ForbiddenError();
}

export async function assertPatientAccess(user: SessionUser, patientId: string) {
  if (user.role === "ADMIN") return;

  const assignment = await prisma.patientAssignment.findFirst({
    where: {
      patientId,
      active: true,
      ...(user.role === "DOCTOR" ? { doctorId: user.doctorId } : {}),
      ...(user.role === "CAREGIVER" ? { caregiverId: user.caregiverId } : {}),
    },
  });
  if (!assignment) throw new ForbiddenError("Patient is not assigned to this user");
}

export function canManageMedicationPlans(user: SessionUser) {
  return user.role === "DOCTOR" || user.role === "ADMIN";
}

export async function assignedPatientIds(user: SessionUser) {
  if (user.role === "ADMIN") {
    const all = await prisma.patient.findMany({ select: { id: true } });
    return all.map((p) => p.id);
  }
  const rows = await prisma.patientAssignment.findMany({
    where: {
      active: true,
      ...(user.role === "DOCTOR" ? { doctorId: user.doctorId } : { caregiverId: user.caregiverId }),
    },
    select: { patientId: true },
  });
  return [...new Set(rows.map((r) => r.patientId))];
}
