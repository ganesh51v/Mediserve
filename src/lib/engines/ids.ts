import { prisma } from "../db";

export async function nextMedicationEventId(scheduledAt: Date) {
  const y = scheduledAt.getFullYear();
  const m = String(scheduledAt.getMonth() + 1).padStart(2, "0");
  const d = String(scheduledAt.getDate()).padStart(2, "0");
  const hh = String(scheduledAt.getHours()).padStart(2, "0");
  const mm = String(scheduledAt.getMinutes()).padStart(2, "0");
  const prefix = `ME-${y}${m}${d}-${hh}${mm}-`;
  const existing = await prisma.medicationEvent.count({
    where: { id: { startsWith: prefix } },
  });
  return `${prefix}${String(existing + 1).padStart(3, "0")}`;
}
