"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { destroySession, getSession, homeFor, login } from "./auth";
import { assertPatientAccess, assertRole, canManageMedicationPlans } from "./rbac";
import { writeAudit } from "./audit";
import { mealUnlocksMedication } from "./engines/mealAware";
import { advanceMedicationEvents } from "./engines/medicationEvents";
import { pressConfirmButton, setSimulatorState, tickSimulator } from "./simulator";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const session = await login(email, password);
  if (!session) return { error: "Invalid email or password" };
  redirect(homeFor(session.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function acknowledgeAlert(alertId: string) {
  const user = await getSession();
  if (!user) redirect("/login");
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!alert) return;
  await assertPatientAccess(user, alert.patientId);
  await prisma.alert.update({
    where: { id: alertId },
    data: { acknowledged: true, acknowledgedById: user.id },
  });
  await writeAudit({ user, patientId: alert.patientId, action: "Alert acknowledged", newValue: alert.title });
  revalidatePath("/");
}

export async function recordMeal(formData: FormData) {
  const user = await getSession();
  if (!user) redirect("/login");
  const patientId = String(formData.get("patientId"));
  await assertPatientAccess(user, patientId);
  const kind = String(formData.get("kind"));
  const eventType = String(formData.get("eventType"));
  const source = String(formData.get("source") ?? "caregiver");
  const occurredAt = new Date();
  await prisma.mealEvent.create({
    data: { patientId, kind, eventType, source, occurredAt },
  });
  await prisma.timelineEvent.create({
    data: {
      patientId,
      occurredAt,
      title:
        eventType === "SENSOR_DETECTED"
          ? `${kind.toLowerCase()} sensor-detected (unverified)`
          : `${kind.charAt(0) + kind.slice(1).toLowerCase()} recorded`,
      detail: `${eventType} via ${source}. Sensor-only events do not unlock after-meal doses.`,
      source,
    },
  });
  await writeAudit({
    user,
    patientId,
    action: "Meal event recorded",
    newValue: `${kind} ${eventType}`,
  });
  if (mealUnlocksMedication(eventType)) {
    await advanceMedicationEvents();
  }
  revalidatePath(`/caregiver/patients/${patientId}`);
  revalidatePath(`/doctor/patients/${patientId}`);
}

export async function createMedicationPlan(formData: FormData) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!canManageMedicationPlans(user)) {
    return { error: "Medication plans require doctor authorization." };
  }
  const patientId = String(formData.get("patientId"));
  await assertPatientAccess(user, patientId);
  const medicationName = String(formData.get("medicine"));
  let medication = await prisma.medication.findFirst({ where: { name: medicationName } });
  if (!medication) {
    medication = await prisma.medication.create({
      data: { name: medicationName, form: "tablet", strength: String(formData.get("dosage")) },
    });
  }
  const plan = await prisma.medicationPlan.create({
    data: {
      patientId,
      medicationId: medication.id,
      dosage: String(formData.get("dosage")),
      frequency: String(formData.get("frequency")),
      startDate: new Date(String(formData.get("startDate"))),
      endDate: formData.get("endDate") ? new Date(String(formData.get("endDate"))) : null,
      scheduledTime: String(formData.get("scheduledTime")),
      mealRelationship: String(formData.get("mealRelationship")),
      mealKind: String(formData.get("mealKind") || "") || null,
      instructions: String(formData.get("instructions") ?? ""),
      deviceSlot: Number(formData.get("deviceSlot") ?? 1),
      authorizedBy: user.id,
      status: "ACTIVE",
    },
  });
  await writeAudit({
    user,
    patientId,
    action: "Medication plan created",
    newValue: JSON.stringify({ medicine: medicationName, time: plan.scheduledTime }),
  });
  await advanceMedicationEvents();
  revalidatePath(`/doctor/patients/${patientId}`);
  return { ok: true };
}

export async function addClinicalNote(formData: FormData) {
  const user = await getSession();
  if (!user) redirect("/login");
  assertRole(user, ["DOCTOR", "ADMIN"]);
  const patientId = String(formData.get("patientId"));
  await assertPatientAccess(user, patientId);
  if (!user.doctorId && user.role !== "ADMIN") return { error: "Doctor profile required" };
  const doctorId =
    user.doctorId ??
    (await prisma.doctor.findFirst({ where: { userId: user.id } }))?.id;
  if (!doctorId) return { error: "Doctor profile required" };
  await prisma.clinicalNote.create({
    data: { patientId, doctorId, body: String(formData.get("body")) },
  });
  await writeAudit({ user, patientId, action: "Clinical instruction added" });
  revalidatePath(`/doctor/patients/${patientId}`);
}

export async function simulatorTick(deviceId?: string) {
  const user = await getSession();
  if (!user) redirect("/login");
  assertRole(user, ["ADMIN", "CAREGIVER", "DOCTOR"]);
  await tickSimulator(deviceId);
  revalidatePath("/simulator");
  revalidatePath("/admin");
}

export async function simulatorSetState(deviceId: string, state: string) {
  const user = await getSession();
  if (!user) redirect("/login");
  assertRole(user, ["ADMIN", "CAREGIVER"]);
  await setSimulatorState(deviceId, state);
  await writeAudit({ user, action: "Simulator state changed", deviceId, newValue: state });
  revalidatePath("/simulator");
}

export async function simulatorConfirm(deviceId: string) {
  const user = await getSession();
  if (!user) redirect("/login");
  await pressConfirmButton(deviceId);
  revalidatePath("/simulator");
}

export async function adminAssign(formData: FormData) {
  const user = await getSession();
  if (!user) redirect("/login");
  assertRole(user, ["ADMIN"]);
  const patientId = String(formData.get("patientId"));
  const doctorId = String(formData.get("doctorId") || "") || null;
  const caregiverId = String(formData.get("caregiverId") || "") || null;
  await prisma.patientAssignment.create({
    data: { patientId, doctorId, caregiverId, active: true },
  });
  await writeAudit({
    user,
    patientId,
    action: "Assignment created",
    newValue: `doctor=${doctorId} caregiver=${caregiverId}`,
  });
  revalidatePath("/admin");
}

export async function registerDevice(formData: FormData) {
  const user = await getSession();
  if (!user) redirect("/login");
  assertRole(user, ["ADMIN"]);
  const serial = String(formData.get("serial"));
  const patientId = String(formData.get("patientId") || "") || null;
  const device = await prisma.device.create({
    data: {
      serial,
      patientId,
      simState: "ONLINE",
      slots: {
        create: [1, 2, 3, 4].map((slotIndex) => ({
          slotIndex,
          stock: "GOOD",
          count: 10,
        })),
      },
    },
  });
  await writeAudit({ user, action: "Device registered", deviceId: device.id, newValue: serial, patientId: patientId ?? undefined });
  revalidatePath("/admin");
}
