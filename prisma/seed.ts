import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function at(day: Date, h: number, m: number) {
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.clinicalNote.deleteMany();
  await prisma.adherenceRecord.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.healthMeasurement.deleteMany();
  await prisma.dispensingEvent.deleteMany();
  await prisma.deviceEvent.deleteMany();
  await prisma.deviceTelemetry.deleteMany();
  await prisma.deviceSlot.deleteMany();
  await prisma.device.deleteMany();
  await prisma.mealEvent.deleteMany();
  await prisma.mealSchedule.deleteMany();
  await prisma.medicationEvent.deleteMany();
  await prisma.medicationPlan.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.patientAssignment.deleteMany();
  await prisma.caregiver.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemConfig.deleteMany();

  const password = await bcrypt.hash("MediServe!23", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@mediserve.local",
      passwordHash: password,
      name: "System Admin",
      role: "ADMIN",
    },
  });

  const doctorUser = await prisma.user.create({
    data: {
      email: "doctor@mediserve.local",
      passwordHash: password,
      name: "Dr. Amrita Shah",
      role: "DOCTOR",
      doctor: { create: { npi: "1234567890", specialty: "Internal Medicine" } },
    },
    include: { doctor: true },
  });

  const caregiverUser = await prisma.user.create({
    data: {
      email: "caregiver@mediserve.local",
      passwordHash: password,
      name: "Noah Patel",
      role: "CAREGIVER",
      caregiver: { create: { phone: "+1-555-0142" } },
    },
    include: { caregiver: true },
  });

  const meds = {
    metformin: await prisma.medication.create({ data: { name: "Metformin", form: "tablet", strength: "500 mg" } }),
    lisinopril: await prisma.medication.create({ data: { name: "Lisinopril", form: "tablet", strength: "10 mg" } }),
    atorva: await prisma.medication.create({ data: { name: "Atorvastatin", form: "tablet", strength: "20 mg" } }),
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const patientA = await prisma.patient.create({
    data: {
      mrn: "MS-A-1001",
      name: "Patient A",
      dateOfBirth: new Date("1958-03-12"),
      sex: "F",
      emergencyName: "Ravi Kumar",
      emergencyPhone: "+1-555-0101",
    },
  });
  const patientB = await prisma.patient.create({
    data: {
      mrn: "MS-B-1002",
      name: "Patient B",
      dateOfBirth: new Date("1949-11-02"),
      sex: "M",
      emergencyName: "Helen Cole",
      emergencyPhone: "+1-555-0102",
    },
  });
  const patientC = await prisma.patient.create({
    data: {
      mrn: "MS-C-1003",
      name: "Patient C",
      dateOfBirth: new Date("1966-07-21"),
      sex: "F",
      emergencyName: "Marco Ruiz",
      emergencyPhone: "+1-555-0103",
    },
  });

  for (const p of [patientA, patientB, patientC]) {
    await prisma.patientAssignment.create({
      data: {
        patientId: p.id,
        doctorId: doctorUser.doctor!.id,
        caregiverId: caregiverUser.caregiver!.id,
      },
    });
    await prisma.mealSchedule.createMany({
      data: [
        { patientId: p.id, kind: "BREAKFAST", typicalTime: "08:00" },
        { patientId: p.id, kind: "LUNCH", typicalTime: "13:00" },
        { patientId: p.id, kind: "DINNER", typicalTime: "19:00" },
      ],
    });
  }

  const start = daysAgo(14);

  const planA1 = await prisma.medicationPlan.create({
    data: {
      patientId: patientA.id,
      medicationId: meds.metformin.id,
      dosage: "500 mg",
      frequency: "Twice daily",
      startDate: start,
      scheduledTime: "08:25",
      mealRelationship: "AFTER_MEAL",
      mealKind: "BREAKFAST",
      instructions: "Take after breakfast with water. Do not change dose without the prescribing doctor.",
      deviceSlot: 1,
      authorizedBy: doctorUser.id,
    },
  });
  const planA2 = await prisma.medicationPlan.create({
    data: {
      patientId: patientA.id,
      medicationId: meds.lisinopril.id,
      dosage: "10 mg",
      frequency: "Once daily",
      startDate: start,
      scheduledTime: "13:20",
      mealRelationship: "AFTER_MEAL",
      mealKind: "LUNCH",
      instructions: "After lunch.",
      deviceSlot: 2,
      authorizedBy: doctorUser.id,
    },
  });

  await prisma.medicationPlan.create({
    data: {
      patientId: patientB.id,
      medicationId: meds.atorva.id,
      dosage: "20 mg",
      frequency: "Once daily",
      startDate: start,
      scheduledTime: "08:30",
      mealRelationship: "NO_MEAL_DEPENDENCY",
      instructions: "Evening preference noted historically; morning slot used for dispenser prototype.",
      deviceSlot: 1,
      authorizedBy: doctorUser.id,
    },
  });
  await prisma.medicationPlan.create({
    data: {
      patientId: patientB.id,
      medicationId: meds.metformin.id,
      dosage: "500 mg",
      frequency: "Twice daily",
      startDate: start,
      scheduledTime: "13:00",
      mealRelationship: "WITH_MEAL",
      mealKind: "LUNCH",
      instructions: "With lunch.",
      deviceSlot: 2,
      authorizedBy: doctorUser.id,
    },
  });

  await prisma.medicationPlan.create({
    data: {
      patientId: patientC.id,
      medicationId: meds.lisinopril.id,
      dosage: "10 mg",
      frequency: "Once daily",
      startDate: start,
      scheduledTime: "09:00",
      mealRelationship: "EMPTY_STOMACH",
      instructions: "Empty stomach window.",
      deviceSlot: 1,
      authorizedBy: doctorUser.id,
    },
  });

  async function event(id: string, patientId: string, planId: string, scheduledAt: Date, state: string, extra: Record<string, unknown> = {}) {
    return prisma.medicationEvent.create({
      data: {
        id,
        patientId,
        planId,
        scheduledAt,
        state,
        ...extra,
      },
    });
  }

  await event("ME-20260916-0825-001", patientA.id, planA1.id, at(today, 8, 25), "CONFIRMED", {
    eligibleAt: at(today, 8, 20),
    dispensedAt: at(today, 8, 25),
    confirmedAt: at(today, 8, 27),
  });
  await event("ME-20260916-1320-001", patientA.id, planA2.id, at(today, 13, 20), "CONFIRMED", {
    eligibleAt: at(today, 13, 5),
    dispensedAt: at(today, 13, 20),
    confirmedAt: at(today, 13, 22),
  });

  const plansB = await prisma.medicationPlan.findMany({ where: { patientId: patientB.id } });
  await event("ME-20260916-0830-001", patientB.id, plansB[0].id, at(today, 8, 30), "MISSED", {
    missedAt: at(today, 10, 35),
  });
  await event("ME-20260916-1300-001", patientB.id, plansB[1].id, at(today, 13, 0), "DUE");

  const plansC = await prisma.medicationPlan.findMany({ where: { patientId: patientC.id } });
  await event("ME-20260916-0900-001", patientC.id, plansC[0].id, at(today, 9, 0), "CONFIRMED", {
    dispensedAt: at(today, 9, 4),
    confirmedAt: at(today, 9, 5),
  });

  for (let i = 1; i <= 10; i++) {
    const day = daysAgo(i);
    await event(`ME-HIST-A-${i}-1`, patientA.id, planA1.id, at(day, 8, 25), "CONFIRMED");
    await event(`ME-HIST-A-${i}-2`, patientA.id, planA2.id, at(day, 13, 20), i === 3 ? "MISSED" : "CONFIRMED");
    await event(`ME-HIST-B-${i}-1`, patientB.id, plansB[0].id, at(day, 8, 30), i % 3 === 0 ? "MISSED" : "CONFIRMED");
    await event(`ME-HIST-B-${i}-2`, patientB.id, plansB[1].id, at(day, 13, 0), i % 4 === 0 ? "MISSED" : "CONFIRMED");
    await event(`ME-HIST-C-${i}-1`, patientC.id, plansC[0].id, at(day, 9, 0), i === 7 ? "FAILED" : "CONFIRMED");
  }

  await prisma.mealEvent.createMany({
    data: [
      { patientId: patientA.id, kind: "BREAKFAST", eventType: "SCHEDULED", source: "schedule", occurredAt: at(today, 8, 0) },
      { patientId: patientA.id, kind: "BREAKFAST", eventType: "CONFIRMED", source: "caregiver", occurredAt: at(today, 8, 0) },
      { patientId: patientA.id, kind: "LUNCH", eventType: "REPORTED", source: "caregiver", occurredAt: at(today, 13, 0) },
      { patientId: patientB.id, kind: "BREAKFAST", eventType: "SENSOR_DETECTED", source: "sensor", occurredAt: at(today, 8, 12) },
      { patientId: patientC.id, kind: "BREAKFAST", eventType: "CONFIRMED", source: "caregiver", occurredAt: at(today, 7, 50) },
      { patientId: patientC.id, kind: "LUNCH", eventType: "CONFIRMED", source: "caregiver", occurredAt: at(today, 12, 40) },
    ],
  });

  const timeline = [
    { patientId: patientA.id, occurredAt: at(today, 8, 0), title: "Breakfast recorded", detail: "Confirmed meal", source: "caregiver" },
    { patientId: patientA.id, occurredAt: at(today, 8, 20), title: "Medication became eligible", detail: "After breakfast rule for ME-20260916-0825-001", source: "meal_aware_engine" },
    { patientId: patientA.id, occurredAt: at(today, 8, 25), title: "Medication dispensed", detail: "ME-20260916-0825-001 slot 1", source: "dispenser" },
    { patientId: patientA.id, occurredAt: at(today, 8, 27), title: "Medication confirmation received", detail: "Physical button", source: "dispenser" },
    { patientId: patientA.id, occurredAt: at(today, 13, 0), title: "Lunch recorded", detail: "Reported meal", source: "caregiver" },
    { patientId: patientA.id, occurredAt: at(today, 13, 20), title: "Medication dispensed", detail: "ME-20260916-1320-001 slot 2", source: "dispenser" },
    { patientId: patientB.id, occurredAt: at(today, 8, 12), title: "Breakfast sensor-detected (unverified)", detail: "Not used as proof the patient ate", source: "sensor" },
    { patientId: patientB.id, occurredAt: at(today, 8, 30), title: "Medication became due", detail: "ME-20260916-0830-001", source: "medication_event_engine" },
  ];
  await prisma.timelineEvent.createMany({ data: timeline });

  await prisma.device.create({
    data: {
      serial: "MS-DISP-A1",
      patientId: patientA.id,
      simState: "ONLINE",
      batteryPct: 84,
      wifiQuality: "Good",
      door: "Closed",
      motor: "Ready",
      sensors: "Normal",
      slots: {
        create: [
          { slotIndex: 1, stock: "GOOD", count: 14 },
          { slotIndex: 2, stock: "LOW", count: 3 },
          { slotIndex: 3, stock: "GOOD", count: 11 },
          { slotIndex: 4, stock: "EMPTY", count: 0 },
        ],
      },
    },
  });
  await prisma.device.create({
    data: {
      serial: "MS-DISP-B1",
      patientId: patientB.id,
      simState: "LOW_BATTERY",
      batteryPct: 18,
      wifiQuality: "Fair",
      slots: {
        create: [
          { slotIndex: 1, stock: "LOW", count: 2 },
          { slotIndex: 2, stock: "GOOD", count: 8 },
          { slotIndex: 3, stock: "GOOD", count: 9 },
          { slotIndex: 4, stock: "GOOD", count: 7 },
        ],
      },
    },
  });
  await prisma.device.create({
    data: {
      serial: "MS-DISP-C1",
      patientId: patientC.id,
      simState: "READY",
      batteryPct: 91,
      slots: {
        create: [1, 2, 3, 4].map((slotIndex) => ({ slotIndex, stock: "GOOD", count: 12 })),
      },
    },
  });

  await prisma.healthMeasurement.createMany({
    data: [
      { patientId: patientA.id, type: "Heart Rate", value: "72", unit: "bpm", source: "authorized cuff/wearable", status: "RECORDED", recordedAt: at(today, 8, 42) },
      { patientId: patientA.id, type: "SpO2", value: "97", unit: "%", source: "pulse oximeter", status: "RECORDED", recordedAt: at(today, 8, 42) },
      { patientId: patientA.id, type: "Weight", value: "68.4", unit: "kg", source: "clinic scale", status: "RECORDED", recordedAt: daysAgo(2) },
      { patientId: patientA.id, type: "Blood Pressure", value: "120/80", unit: "mmHg", source: "authorized cuff", status: "RECORDED", recordedAt: at(today, 8, 42) },
      { patientId: patientB.id, type: "Heart Rate", value: "118", unit: "bpm", source: "authorized wearable", status: "REQUIRES_REVIEW", recordedAt: at(today, 9, 10) },
      { patientId: patientB.id, type: "Blood Glucose", value: "92", unit: "mg/dL", source: "glucometer", status: "RECORDED", recordedAt: at(today, 7, 55) },
    ],
  });

  await prisma.alert.createMany({
    data: [
      {
        patientId: patientB.id,
        category: "MEDICATION",
        priority: "WARNING",
        title: "Medication missed",
        body: "Patient: Patient B\nMedicine: Atorvastatin\nScheduled: 08:30 AM\nEvent: ME-20260916-0830-001",
      },
      {
        patientId: patientB.id,
        category: "HEALTH",
        priority: "WARNING",
        title: "Health measurement requires review",
        body: "Patient: Patient B\nHeart Rate: 118 bpm\nThis is a monitoring signal, not a diagnosis.",
      },
      {
        patientId: patientB.id,
        category: "DEVICE",
        priority: "WARNING",
        title: "Low battery",
        body: "Dispenser MS-DISP-B1 battery is 18%.",
      },
    ],
  });

  await prisma.clinicalNote.create({
    data: {
      patientId: patientA.id,
      doctorId: doctorUser.doctor!.id,
      body: "Continue current metformin plan. Confirm after-breakfast window with caregiver. This note is a clinical instruction, not an automated dose change.",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: doctorUser.id,
      role: "DOCTOR",
      patientId: patientA.id,
      action: "Medication Plan Updated",
      timestamp: at(today, 10, 32),
      previousValue: "Metformin 500 mg 08:00 AFTER_MEAL",
      newValue: "Metformin 500 mg 08:25 AFTER_MEAL",
      result: "OK",
    },
  });

  await prisma.systemConfig.create({
    data: {
      id: "default",
      json: JSON.stringify({
        confirmationWorkflow: "button_plus_collection_sensor",
        healthThresholds: "configured_by_clinician_not_invented",
        product: "monitoring_support_not_autonomous_diagnosis",
      }),
    },
  });

  console.log("Seeded MediServe prototype");
  console.log("Login: admin@mediserve.local | doctor@mediserve.local | caregiver@mediserve.local");
  console.log("Password: MediServe!23");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
