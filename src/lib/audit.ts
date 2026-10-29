import { prisma } from "./db";
import type { SessionUser } from "./auth";

export async function writeAudit(opts: {
  user?: SessionUser | null;
  patientId?: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  deviceId?: string;
  result?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: opts.user?.id,
      role: opts.user?.role ?? "SYSTEM",
      patientId: opts.patientId,
      action: opts.action,
      previousValue: opts.previousValue ?? "",
      newValue: opts.newValue ?? "",
      deviceId: opts.deviceId,
      result: opts.result ?? "OK",
    },
  });
}
