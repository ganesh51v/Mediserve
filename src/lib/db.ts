import bcrypt from "bcryptjs";
import { supabase } from "./supabase";

export { supabase };

// Types matching the MediServe schema
export interface DBUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  createdAt: Date;
}

export interface DBDoctor {
  id: string;
  userId: string;
  npi: string;
  specialty: string;
}

export interface DBCaregiver {
  id: string;
  userId: string;
  phone: string;
}

export interface DBPatient {
  id: string;
  mrn: string;
  name: string;
  dateOfBirth: Date;
  sex: string;
  emergencyName: string;
  emergencyPhone: string;
  notes: string;
  createdAt: Date;
}

export interface DBPatientAssignment {
  id: string;
  patientId: string;
  doctorId: string | null;
  caregiverId: string | null;
  active: boolean;
  createdAt: Date;
}

export interface DBMedication {
  id: string;
  name: string;
  form: string;
  strength: string;
}

export interface DBMedicationPlan {
  id: string;
  patientId: string;
  medicationId: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate: Date | null;
  scheduledTime: string;
  mealRelationship: string;
  mealKind: string | null;
  instructions: string;
  deviceSlot: number;
  authorizedBy: string;
  status: string;
  createdAt: Date;
}

export interface DBMedicationEvent {
  id: string;
  patientId: string;
  planId: string;
  scheduledAt: Date;
  state: string;
  eligibleAt: Date | null;
  notifiedAt: Date | null;
  dispensedAt: Date | null;
  confirmedAt: Date | null;
  missedAt: Date | null;
  failedReason: string | null;
  delayMinutes: number | null;
  deviceId: string | null;
  createdAt: Date;
}

export interface DBMealSchedule {
  id: string;
  patientId: string;
  kind: string;
  typicalTime: string;
  active: boolean;
}

export interface DBMealEvent {
  id: string;
  patientId: string;
  kind: string;
  eventType: string;
  occurredAt: Date;
  source: string;
  notes: string;
}

export interface DBDevice {
  id: string;
  serial: string;
  patientId: string | null;
  firmware: string;
  simState: string;
  online: boolean;
  batteryPct: number;
  wifiQuality: string;
  door: string;
  motor: string;
  sensors: string;
  lastSeenAt: Date;
}

export interface DBDeviceSlot {
  id: string;
  deviceId: string;
  slotIndex: number;
  stock: string;
  count: number;
}

export interface DBDeviceTelemetry {
  id: string;
  deviceId: string;
  batteryPct: number;
  wifiRssi: number;
  online: boolean;
  recordedAt: Date;
}

export interface DBDeviceEvent {
  id: string;
  deviceId: string;
  type: string;
  payload: string;
  createdAt: Date;
}

export interface DBDispensingEvent {
  id: string;
  deviceId: string;
  medicationEventId: string;
  slotIndex: number;
  result: string;
  sensorVerified: boolean;
  createdAt: Date;
}

export interface DBHealthMeasurement {
  id: string;
  patientId: string;
  type: string;
  value: string;
  unit: string;
  source: string;
  status: string;
  recordedAt: Date;
}

export interface DBAlert {
  id: string;
  patientId: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  isDiagnosis: boolean;
  acknowledged: boolean;
  acknowledgedById: string | null;
  createdAt: Date;
}

export interface DBNotification {
  id: string;
  userId: string;
  channel: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
}

export interface DBAdherenceRecord {
  id: string;
  patientId: string;
  period: string;
  periodStart: Date;
  taken: number;
  missed: number;
  delayed: number;
  failed: number;
  ratePct: number;
}

export interface DBTimelineEvent {
  id: string;
  patientId: string;
  occurredAt: Date;
  title: string;
  detail: string;
  source: string;
}

export interface DBClinicalNote {
  id: string;
  patientId: string;
  doctorId: string;
  body: string;
  createdAt: Date;
}

export interface DBAuditLog {
  id: string;
  userId: string | null;
  role: string;
  patientId: string | null;
  action: string;
  timestamp: Date;
  previousValue: string;
  newValue: string;
  deviceId: string | null;
  result: string;
}

export interface DBSystemConfig {
  id: string;
  json: string;
}

let nextIdCounter = 1000;
function cuid(): string {
  return "c" + Math.random().toString(36).substring(2, 9) + (nextIdCounter++);
}

// In-Memory Database Collections
export class MemoryDatabase {
  users: DBUser[] = [];
  doctors: DBDoctor[] = [];
  caregivers: DBCaregiver[] = [];
  patients: DBPatient[] = [];
  patientAssignments: DBPatientAssignment[] = [];
  medications: DBMedication[] = [];
  medicationPlans: DBMedicationPlan[] = [];
  medicationEvents: DBMedicationEvent[] = [];
  mealSchedules: DBMealSchedule[] = [];
  mealEvents: DBMealEvent[] = [];
  devices: DBDevice[] = [];
  deviceSlots: DBDeviceSlot[] = [];
  deviceTelemetries: DBDeviceTelemetry[] = [];
  deviceEvents: DBDeviceEvent[] = [];
  dispensingEvents: DBDispensingEvent[] = [];
  healthMeasurements: DBHealthMeasurement[] = [];
  alerts: DBAlert[] = [];
  notifications: DBNotification[] = [];
  adherenceRecords: DBAdherenceRecord[] = [];
  timelineEvents: DBTimelineEvent[] = [];
  clinicalNotes: DBClinicalNote[] = [];
  auditLogs: DBAuditLog[] = [];
  systemConfigs: DBSystemConfig[] = [];

  constructor() {
    this.seedDefaults();
  }

  seedDefaults() {
    const passwordHash = bcrypt.hashSync("MediServe!23", 10);
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const at = (d: Date, h: number, m: number) => {
      const res = new Date(d);
      res.setHours(h, m, 0, 0);
      return res;
    };
    const daysAgo = (n: number) => {
      const res = new Date(today);
      res.setDate(res.getDate() - n);
      return res;
    };

    // Users
    const adminUser: DBUser = {
      id: "usr-admin-1",
      email: "admin@mediserve.local",
      passwordHash,
      name: "System Admin",
      role: "ADMIN",
      createdAt: daysAgo(30),
    };
    const doctorUser: DBUser = {
      id: "usr-doctor-1",
      email: "doctor@mediserve.local",
      passwordHash,
      name: "Dr. Amrita Shah",
      role: "DOCTOR",
      createdAt: daysAgo(30),
    };
    const caregiverUser: DBUser = {
      id: "usr-caregiver-1",
      email: "caregiver@mediserve.local",
      passwordHash,
      name: "Noah Patel",
      role: "CAREGIVER",
      createdAt: daysAgo(30),
    };
    this.users.push(adminUser, doctorUser, caregiverUser);

    const doctorProfile: DBDoctor = {
      id: "doc-1",
      userId: doctorUser.id,
      npi: "1234567890",
      specialty: "Internal Medicine",
    };
    this.doctors.push(doctorProfile);

    const caregiverProfile: DBCaregiver = {
      id: "cg-1",
      userId: caregiverUser.id,
      phone: "+1-555-0142",
    };
    this.caregivers.push(caregiverProfile);

    // Medications
    const medMetformin: DBMedication = { id: "med-1", name: "Metformin", form: "tablet", strength: "500 mg" };
    const medLisinopril: DBMedication = { id: "med-2", name: "Lisinopril", form: "tablet", strength: "10 mg" };
    const medAtorva: DBMedication = { id: "med-3", name: "Atorvastatin", form: "tablet", strength: "20 mg" };
    this.medications.push(medMetformin, medLisinopril, medAtorva);

    // Patients
    const patientA: DBPatient = {
      id: "pat-1",
      mrn: "MS-A-1001",
      name: "Patient A",
      dateOfBirth: new Date("1958-03-12"),
      sex: "F",
      emergencyName: "Ravi Kumar",
      emergencyPhone: "+1-555-0101",
      notes: "Type 2 diabetes, Hypertension",
      createdAt: daysAgo(30),
    };
    const patientB: DBPatient = {
      id: "pat-2",
      mrn: "MS-B-1002",
      name: "Patient B",
      dateOfBirth: new Date("1949-11-02"),
      sex: "M",
      emergencyName: "Helen Cole",
      emergencyPhone: "+1-555-0102",
      notes: "Hyperlipidemia, T2D",
      createdAt: daysAgo(30),
    };
    const patientC: DBPatient = {
      id: "pat-3",
      mrn: "MS-C-1003",
      name: "Patient C",
      dateOfBirth: new Date("1966-07-21"),
      sex: "F",
      emergencyName: "Marco Ruiz",
      emergencyPhone: "+1-555-0103",
      notes: "Hypertension",
      createdAt: daysAgo(30),
    };
    this.patients.push(patientA, patientB, patientC);

    // Assignments & Meal Schedules
    for (const p of [patientA, patientB, patientC]) {
      this.patientAssignments.push({
        id: cuid(),
        patientId: p.id,
        doctorId: doctorProfile.id,
        caregiverId: caregiverProfile.id,
        active: true,
        createdAt: daysAgo(20),
      });
      this.mealSchedules.push(
        { id: cuid(), patientId: p.id, kind: "BREAKFAST", typicalTime: "08:00", active: true },
        { id: cuid(), patientId: p.id, kind: "LUNCH", typicalTime: "13:00", active: true },
        { id: cuid(), patientId: p.id, kind: "DINNER", typicalTime: "19:00", active: true },
      );
    }

    // Medication Plans
    const planA1: DBMedicationPlan = {
      id: "plan-a1",
      patientId: patientA.id,
      medicationId: medMetformin.id,
      dosage: "500 mg",
      frequency: "Twice daily",
      startDate: daysAgo(14),
      endDate: null,
      scheduledTime: "08:25",
      mealRelationship: "AFTER_MEAL",
      mealKind: "BREAKFAST",
      instructions: "Take after breakfast with water. Do not change dose without prescribing doctor.",
      deviceSlot: 1,
      authorizedBy: doctorUser.id,
      status: "ACTIVE",
      createdAt: daysAgo(14),
    };
    const planA2: DBMedicationPlan = {
      id: "plan-a2",
      patientId: patientA.id,
      medicationId: medLisinopril.id,
      dosage: "10 mg",
      frequency: "Once daily",
      startDate: daysAgo(14),
      endDate: null,
      scheduledTime: "13:20",
      mealRelationship: "AFTER_MEAL",
      mealKind: "LUNCH",
      instructions: "After lunch.",
      deviceSlot: 2,
      authorizedBy: doctorUser.id,
      status: "ACTIVE",
      createdAt: daysAgo(14),
    };
    const planB1: DBMedicationPlan = {
      id: "plan-b1",
      patientId: patientB.id,
      medicationId: medAtorva.id,
      dosage: "20 mg",
      frequency: "Once daily",
      startDate: daysAgo(14),
      endDate: null,
      scheduledTime: "08:30",
      mealRelationship: "NO_MEAL_DEPENDENCY",
      mealKind: null,
      instructions: "Morning slot used for dispenser prototype.",
      deviceSlot: 1,
      authorizedBy: doctorUser.id,
      status: "ACTIVE",
      createdAt: daysAgo(14),
    };
    const planB2: DBMedicationPlan = {
      id: "plan-b2",
      patientId: patientB.id,
      medicationId: medMetformin.id,
      dosage: "500 mg",
      frequency: "Twice daily",
      startDate: daysAgo(14),
      endDate: null,
      scheduledTime: "13:00",
      mealRelationship: "WITH_MEAL",
      mealKind: "LUNCH",
      instructions: "With lunch.",
      deviceSlot: 2,
      authorizedBy: doctorUser.id,
      status: "ACTIVE",
      createdAt: daysAgo(14),
    };
    const planC1: DBMedicationPlan = {
      id: "plan-c1",
      patientId: patientC.id,
      medicationId: medLisinopril.id,
      dosage: "10 mg",
      frequency: "Once daily",
      startDate: daysAgo(14),
      endDate: null,
      scheduledTime: "09:00",
      mealRelationship: "EMPTY_STOMACH",
      mealKind: null,
      instructions: "Empty stomach window.",
      deviceSlot: 1,
      authorizedBy: doctorUser.id,
      status: "ACTIVE",
      createdAt: daysAgo(14),
    };
    this.medicationPlans.push(planA1, planA2, planB1, planB2, planC1);

    // Today's Medication Events
    this.medicationEvents.push(
      {
        id: "ME-20260916-0825-001",
        patientId: patientA.id,
        planId: planA1.id,
        scheduledAt: at(today, 8, 25),
        state: "CONFIRMED",
        eligibleAt: at(today, 8, 20),
        notifiedAt: at(today, 8, 20),
        dispensedAt: at(today, 8, 25),
        confirmedAt: at(today, 8, 27),
        missedAt: null,
        failedReason: null,
        delayMinutes: 0,
        deviceId: "dev-a1",
        createdAt: at(today, 8, 0),
      },
      {
        id: "ME-20260916-1320-001",
        patientId: patientA.id,
        planId: planA2.id,
        scheduledAt: at(today, 13, 20),
        state: "CONFIRMED",
        eligibleAt: at(today, 13, 5),
        notifiedAt: at(today, 13, 5),
        dispensedAt: at(today, 13, 20),
        confirmedAt: at(today, 13, 22),
        missedAt: null,
        failedReason: null,
        delayMinutes: 0,
        deviceId: "dev-a1",
        createdAt: at(today, 8, 0),
      },
      {
        id: "ME-20260916-0830-001",
        patientId: patientB.id,
        planId: planB1.id,
        scheduledAt: at(today, 8, 30),
        state: "MISSED",
        eligibleAt: at(today, 8, 30),
        notifiedAt: at(today, 8, 30),
        dispensedAt: null,
        confirmedAt: null,
        missedAt: at(today, 10, 35),
        failedReason: null,
        delayMinutes: null,
        deviceId: "dev-b1",
        createdAt: at(today, 8, 0),
      },
      {
        id: "ME-20260916-1300-001",
        patientId: patientB.id,
        planId: planB2.id,
        scheduledAt: at(today, 13, 0),
        state: "DUE",
        eligibleAt: null,
        notifiedAt: null,
        dispensedAt: null,
        confirmedAt: null,
        missedAt: null,
        failedReason: null,
        delayMinutes: null,
        deviceId: "dev-b1",
        createdAt: at(today, 8, 0),
      },
      {
        id: "ME-20260916-0900-001",
        patientId: patientC.id,
        planId: planC1.id,
        scheduledAt: at(today, 9, 0),
        state: "CONFIRMED",
        eligibleAt: at(today, 9, 0),
        notifiedAt: at(today, 9, 0),
        dispensedAt: at(today, 9, 4),
        confirmedAt: at(today, 9, 5),
        missedAt: null,
        failedReason: null,
        delayMinutes: 4,
        deviceId: "dev-c1",
        createdAt: at(today, 8, 0),
      },
    );

    // 10 Days History Events
    for (let i = 1; i <= 10; i++) {
      const d = daysAgo(i);
      this.medicationEvents.push(
        {
          id: `ME-HIST-A-${i}-1`,
          patientId: patientA.id,
          planId: planA1.id,
          scheduledAt: at(d, 8, 25),
          state: "CONFIRMED",
          eligibleAt: at(d, 8, 20),
          notifiedAt: at(d, 8, 20),
          dispensedAt: at(d, 8, 25),
          confirmedAt: at(d, 8, 27),
          missedAt: null,
          failedReason: null,
          delayMinutes: 0,
          deviceId: "dev-a1",
          createdAt: d,
        },
        {
          id: `ME-HIST-A-${i}-2`,
          patientId: patientA.id,
          planId: planA2.id,
          scheduledAt: at(d, 13, 20),
          state: i === 3 ? "MISSED" : "CONFIRMED",
          eligibleAt: at(d, 13, 0),
          notifiedAt: at(d, 13, 0),
          dispensedAt: i === 3 ? null : at(d, 13, 20),
          confirmedAt: i === 3 ? null : at(d, 13, 22),
          missedAt: i === 3 ? at(d, 15, 30) : null,
          failedReason: null,
          delayMinutes: i === 3 ? null : 0,
          deviceId: "dev-a1",
          createdAt: d,
        },
        {
          id: `ME-HIST-B-${i}-1`,
          patientId: patientB.id,
          planId: planB1.id,
          scheduledAt: at(d, 8, 30),
          state: i % 3 === 0 ? "MISSED" : "CONFIRMED",
          eligibleAt: at(d, 8, 30),
          notifiedAt: at(d, 8, 30),
          dispensedAt: i % 3 === 0 ? null : at(d, 8, 32),
          confirmedAt: i % 3 === 0 ? null : at(d, 8, 35),
          missedAt: i % 3 === 0 ? at(d, 10, 40) : null,
          failedReason: null,
          delayMinutes: i % 3 === 0 ? null : 2,
          deviceId: "dev-b1",
          createdAt: d,
        },
        {
          id: `ME-HIST-B-${i}-2`,
          patientId: patientB.id,
          planId: planB2.id,
          scheduledAt: at(d, 13, 0),
          state: i % 4 === 0 ? "MISSED" : "CONFIRMED",
          eligibleAt: at(d, 13, 0),
          notifiedAt: at(d, 13, 0),
          dispensedAt: i % 4 === 0 ? null : at(d, 13, 10),
          confirmedAt: i % 4 === 0 ? null : at(d, 13, 12),
          missedAt: i % 4 === 0 ? at(d, 15, 15) : null,
          failedReason: null,
          delayMinutes: i % 4 === 0 ? null : 10,
          deviceId: "dev-b1",
          createdAt: d,
        },
        {
          id: `ME-HIST-C-${i}-1`,
          patientId: patientC.id,
          planId: planC1.id,
          scheduledAt: at(d, 9, 0),
          state: i === 7 ? "FAILED" : "CONFIRMED",
          eligibleAt: at(d, 9, 0),
          notifiedAt: at(d, 9, 0),
          dispensedAt: i === 7 ? null : at(d, 9, 5),
          confirmedAt: i === 7 ? null : at(d, 9, 6),
          missedAt: null,
          failedReason: i === 7 ? "Dispenser motor jam" : null,
          delayMinutes: i === 7 ? null : 5,
          deviceId: "dev-c1",
          createdAt: d,
        },
      );
    }

    // Meal Events
    this.mealEvents.push(
      { id: cuid(), patientId: patientA.id, kind: "BREAKFAST", eventType: "SCHEDULED", source: "schedule", notes: "", occurredAt: at(today, 8, 0) },
      { id: cuid(), patientId: patientA.id, kind: "BREAKFAST", eventType: "CONFIRMED", source: "caregiver", notes: "", occurredAt: at(today, 8, 0) },
      { id: cuid(), patientId: patientA.id, kind: "LUNCH", eventType: "REPORTED", source: "caregiver", notes: "", occurredAt: at(today, 13, 0) },
      { id: cuid(), patientId: patientB.id, kind: "BREAKFAST", eventType: "SENSOR_DETECTED", source: "sensor", notes: "", occurredAt: at(today, 8, 12) },
      { id: cuid(), patientId: patientC.id, kind: "BREAKFAST", eventType: "CONFIRMED", source: "caregiver", notes: "", occurredAt: at(today, 7, 50) },
      { id: cuid(), patientId: patientC.id, kind: "LUNCH", eventType: "CONFIRMED", source: "caregiver", notes: "", occurredAt: at(today, 12, 40) },
    );

    // Timeline Events
    this.timelineEvents.push(
      { id: cuid(), patientId: patientA.id, occurredAt: at(today, 8, 0), title: "Breakfast recorded", detail: "Confirmed meal", source: "caregiver" },
      { id: cuid(), patientId: patientA.id, occurredAt: at(today, 8, 20), title: "Medication became eligible", detail: "After breakfast rule for ME-20260916-0825-001", source: "meal_aware_engine" },
      { id: cuid(), patientId: patientA.id, occurredAt: at(today, 8, 25), title: "Medication dispensed", detail: "ME-20260916-0825-001 slot 1", source: "dispenser" },
      { id: cuid(), patientId: patientA.id, occurredAt: at(today, 8, 27), title: "Medication confirmation received", detail: "Physical button", source: "dispenser" },
      { id: cuid(), patientId: patientA.id, occurredAt: at(today, 13, 0), title: "Lunch recorded", detail: "Reported meal", source: "caregiver" },
      { id: cuid(), patientId: patientA.id, occurredAt: at(today, 13, 20), title: "Medication dispensed", detail: "ME-20260916-1320-001 slot 2", source: "dispenser" },
      { id: cuid(), patientId: patientB.id, occurredAt: at(today, 8, 12), title: "Breakfast sensor-detected (unverified)", detail: "Not used as proof the patient ate", source: "sensor" },
      { id: cuid(), patientId: patientB.id, occurredAt: at(today, 8, 30), title: "Medication became due", detail: "ME-20260916-0830-001", source: "medication_event_engine" },
    );

    // Devices & Slots
    const devA: DBDevice = {
      id: "dev-a1",
      serial: "MS-DISP-A1",
      patientId: patientA.id,
      firmware: "sim-0.1.0",
      simState: "ONLINE",
      online: true,
      batteryPct: 84,
      wifiQuality: "Good",
      door: "Closed",
      motor: "Ready",
      sensors: "Normal",
      lastSeenAt: now,
    };
    const devB: DBDevice = {
      id: "dev-b1",
      serial: "MS-DISP-B1",
      patientId: patientB.id,
      firmware: "sim-0.1.0",
      simState: "LOW_BATTERY",
      online: true,
      batteryPct: 18,
      wifiQuality: "Fair",
      door: "Closed",
      motor: "Ready",
      sensors: "Normal",
      lastSeenAt: now,
    };
    const devC: DBDevice = {
      id: "dev-c1",
      serial: "MS-DISP-C1",
      patientId: patientC.id,
      firmware: "sim-0.1.0",
      simState: "READY",
      online: true,
      batteryPct: 91,
      wifiQuality: "Good",
      door: "Closed",
      motor: "Ready",
      sensors: "Normal",
      lastSeenAt: now,
    };
    this.devices.push(devA, devB, devC);

    this.deviceSlots.push(
      { id: cuid(), deviceId: devA.id, slotIndex: 1, stock: "GOOD", count: 14 },
      { id: cuid(), deviceId: devA.id, slotIndex: 2, stock: "LOW", count: 3 },
      { id: cuid(), deviceId: devA.id, slotIndex: 3, stock: "GOOD", count: 11 },
      { id: cuid(), deviceId: devA.id, slotIndex: 4, stock: "EMPTY", count: 0 },
      { id: cuid(), deviceId: devB.id, slotIndex: 1, stock: "LOW", count: 2 },
      { id: cuid(), deviceId: devB.id, slotIndex: 2, stock: "GOOD", count: 8 },
      { id: cuid(), deviceId: devB.id, slotIndex: 3, stock: "GOOD", count: 9 },
      { id: cuid(), deviceId: devB.id, slotIndex: 4, stock: "GOOD", count: 7 },
      { id: cuid(), deviceId: devC.id, slotIndex: 1, stock: "GOOD", count: 12 },
      { id: cuid(), deviceId: devC.id, slotIndex: 2, stock: "GOOD", count: 12 },
      { id: cuid(), deviceId: devC.id, slotIndex: 3, stock: "GOOD", count: 12 },
      { id: cuid(), deviceId: devC.id, slotIndex: 4, stock: "GOOD", count: 12 },
    );

    // Health Measurements
    this.healthMeasurements.push(
      { id: cuid(), patientId: patientA.id, type: "Heart Rate", value: "72", unit: "bpm", source: "authorized cuff/wearable", status: "RECORDED", recordedAt: at(today, 8, 42) },
      { id: cuid(), patientId: patientA.id, type: "SpO2", value: "97", unit: "%", source: "pulse oximeter", status: "RECORDED", recordedAt: at(today, 8, 42) },
      { id: cuid(), patientId: patientA.id, type: "Weight", value: "68.4", unit: "kg", source: "clinic scale", status: "RECORDED", recordedAt: daysAgo(2) },
      { id: cuid(), patientId: patientA.id, type: "Blood Pressure", value: "120/80", unit: "mmHg", source: "authorized cuff", status: "RECORDED", recordedAt: at(today, 8, 42) },
      { id: cuid(), patientId: patientB.id, type: "Heart Rate", value: "118", unit: "bpm", source: "authorized wearable", status: "REQUIRES_REVIEW", recordedAt: at(today, 9, 10) },
      { id: cuid(), patientId: patientB.id, type: "Blood Glucose", value: "92", unit: "mg/dL", source: "glucometer", status: "RECORDED", recordedAt: at(today, 7, 55) },
    );

    // Alerts
    this.alerts.push(
      {
        id: cuid(),
        patientId: patientB.id,
        category: "MEDICATION",
        priority: "WARNING",
        title: "Medication missed",
        body: "Patient: Patient B\nMedicine: Atorvastatin\nScheduled: 08:30 AM\nEvent: ME-20260916-0830-001",
        isDiagnosis: false,
        acknowledged: false,
        acknowledgedById: null,
        createdAt: at(today, 10, 35),
      },
      {
        id: cuid(),
        patientId: patientB.id,
        category: "HEALTH",
        priority: "WARNING",
        title: "Health measurement requires review",
        body: "Patient: Patient B\nHeart Rate: 118 bpm\nThis is a monitoring signal, not a diagnosis.",
        isDiagnosis: false,
        acknowledged: false,
        acknowledgedById: null,
        createdAt: at(today, 9, 10),
      },
      {
        id: cuid(),
        patientId: patientB.id,
        category: "DEVICE",
        priority: "WARNING",
        title: "Low battery",
        body: "Dispenser MS-DISP-B1 battery is 18%.",
        isDiagnosis: false,
        acknowledged: false,
        acknowledgedById: null,
        createdAt: at(today, 8, 30),
      },
    );

    // Clinical Notes
    this.clinicalNotes.push({
      id: cuid(),
      patientId: patientA.id,
      doctorId: doctorProfile.id,
      body: "Continue current metformin plan. Confirm after-breakfast window with caregiver. This note is a clinical instruction, not an automated dose change.",
      createdAt: at(today, 10, 32),
    });

    // Audit Log
    this.auditLogs.push({
      id: cuid(),
      userId: doctorUser.id,
      role: "DOCTOR",
      patientId: patientA.id,
      action: "Medication Plan Updated",
      timestamp: at(today, 10, 32),
      previousValue: "Metformin 500 mg 08:00 AFTER_MEAL",
      newValue: "Metformin 500 mg 08:25 AFTER_MEAL",
      deviceId: null,
      result: "OK",
    });

    // System Config
    this.systemConfigs.push({
      id: "default",
      json: JSON.stringify({
        confirmationWorkflow: "button_plus_collection_sensor",
        healthThresholds: "configured_by_clinician_not_invented",
        product: "monitoring_support_not_autonomous_diagnosis",
      }),
    });
  }
}

// Global instance to persist in-memory across hot reloads and test runs
const globalStore = globalThis as unknown as { __mediserve_db?: MemoryDatabase };
if (!globalStore.__mediserve_db) {
  globalStore.__mediserve_db = new MemoryDatabase();
}
export const db = globalStore.__mediserve_db;

// Generic filter function matching Prisma where semantics
function matchesWhere(item: any, where: any): boolean {
  if (!where) return true;
  for (const key of Object.keys(where)) {
    if (key === "OR" && Array.isArray(where.OR)) {
      const matchAny = where.OR.some((cond: any) => matchesWhere(item, cond));
      if (!matchAny) return false;
      continue;
    }
    if (key === "AND" && Array.isArray(where.AND)) {
      const matchAll = where.AND.every((cond: any) => matchesWhere(item, cond));
      if (!matchAll) return false;
      continue;
    }
    const val = item[key];
    const target = where[key];

    if (target === undefined) continue;
    if (target === null) {
      if (val !== null) return false;
      continue;
    }
    if (typeof target === "object" && !(target instanceof Date)) {
      if (Array.isArray(target.in)) {
        if (!target.in.includes(val)) return false;
        continue;
      }
      if (target.gte !== undefined) {
        const valDate = val instanceof Date ? val.getTime() : val;
        const targetDate = target.gte instanceof Date ? target.gte.getTime() : target.gte;
        if (valDate < targetDate) return false;
      }
      if (target.lte !== undefined) {
        const valDate = val instanceof Date ? val.getTime() : val;
        const targetDate = target.lte instanceof Date ? target.lte.getTime() : target.lte;
        if (valDate > targetDate) return false;
      }
      if (target.startsWith !== undefined) {
        if (typeof val !== "string" || !val.startsWith(target.startsWith)) return false;
      }
      continue;
    }
    if (val instanceof Date && target instanceof Date) {
      if (val.getTime() !== target.getTime()) return false;
      continue;
    }
    if (val !== target) return false;
  }
  return true;
}

function applyOrderBy(list: any[], orderBy: any) {
  if (!orderBy) return list;
  const key = Object.keys(orderBy)[0];
  const dir = orderBy[key];
  return [...list].sort((a, b) => {
    const valA = a[key];
    const valB = b[key];
    if (valA instanceof Date && valB instanceof Date) {
      return dir === "asc" ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
    }
    if (valA < valB) return dir === "asc" ? -1 : 1;
    if (valA > valB) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

// Prisma-compatible Client Interface
export const prisma = {
  $disconnect: async () => {},

  user: {
    findUnique: async (args: { where: { email?: string; id?: string }; include?: any }) => {
      let u: any = db.users.find((x) =>
        args.where.id ? x.id === args.where.id : x.email.toLowerCase() === args.where.email?.toLowerCase(),
      );
      if (!u) return null;
      u = { ...u };
      if (args.include?.doctor) {
        u.doctor = db.doctors.find((d) => d.userId === u.id) || null;
      }
      if (args.include?.caregiver) {
        u.caregiver = db.caregivers.find((c) => c.userId === u.id) || null;
      }
      return u;
    },
    findMany: async () => [...db.users],
    create: async ({ data }: any) => {
      const u: DBUser = {
        id: cuid(),
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        name: data.name,
        role: data.role,
        createdAt: new Date(),
      };
      db.users.push(u);
      return { ...u };
    },
    deleteMany: async () => {
      const count = db.users.length;
      db.users = [];
      return { count };
    },
  },

  doctor: {
    findFirst: async (args?: { where?: any }) => {
      const item = db.doctors.find((d) => matchesWhere(d, args?.where));
      return item ? { ...item } : null;
    },
    findMany: async (args?: { include?: any }) => {
      return db.doctors.map((d) => {
        const copy: any = { ...d };
        if (args?.include?.user) copy.user = db.users.find((u) => u.id === d.userId) || null;
        return copy;
      });
    },
    create: async ({ data }: any) => {
      const d: DBDoctor = { id: cuid(), ...data };
      db.doctors.push(d);
      return { ...d };
    },
    deleteMany: async () => {
      db.doctors = [];
      return { count: 0 };
    },
  },

  caregiver: {
    findFirst: async (args?: { where?: any }) => {
      const item = db.caregivers.find((c) => matchesWhere(c, args?.where));
      return item ? { ...item } : null;
    },
    findMany: async (args?: { include?: any }) => {
      return db.caregivers.map((c) => {
        const copy: any = { ...c };
        if (args?.include?.user) copy.user = db.users.find((u) => u.id === c.userId) || null;
        return copy;
      });
    },
    create: async ({ data }: any) => {
      const c: DBCaregiver = { id: cuid(), ...data };
      db.caregivers.push(c);
      return { ...c };
    },
    deleteMany: async () => {
      db.caregivers = [];
      return { count: 0 };
    },
  },

  patient: {
    findUnique: async (args: { where: { id?: string; mrn?: string }; include?: any }) => {
      const p = db.patients.find((x) => (args.where.id ? x.id === args.where.id : x.mrn === args.where.mrn));
      if (!p) return null;
      return hydratePatient(p, args.include);
    },
    findMany: async (args?: { where?: any; include?: any; select?: any }) => {
      let filtered = db.patients.filter((p) => matchesWhere(p, args?.where));
      if (args?.select?.id) {
        return filtered.map((p) => ({ id: p.id }));
      }
      return filtered.map((p) => hydratePatient(p, args?.include));
    },
    create: async ({ data }: any) => {
      const p: DBPatient = {
        id: cuid(),
        notes: "",
        createdAt: new Date(),
        ...data,
      };
      db.patients.push(p);
      return { ...p };
    },
    deleteMany: async () => {
      db.patients = [];
      return { count: 0 };
    },
  },

  patientAssignment: {
    findFirst: async (args?: { where?: any }) => {
      const item = db.patientAssignments.find((a) => matchesWhere(a, args?.where));
      return item ? { ...item } : null;
    },
    findMany: async (args?: { where?: any; select?: any; include?: any }) => {
      const filtered = db.patientAssignments.filter((a) => matchesWhere(a, args?.where));
      if (args?.select?.patientId) {
        return filtered.map((a) => ({ patientId: a.patientId }));
      }
      return filtered.map((a) => {
        const copy: any = { ...a };
        if (args?.include?.doctor) {
          const doc = db.doctors.find((d) => d.id === a.doctorId);
          const docUser = doc ? db.users.find((u) => u.id === doc.userId) : null;
          copy.doctor = doc ? { ...doc, user: docUser } : null;
        }
        if (args?.include?.caregiver) {
          const cg = db.caregivers.find((c) => c.id === a.caregiverId);
          const cgUser = cg ? db.users.find((u) => u.id === cg.userId) : null;
          copy.caregiver = cg ? { ...cg, user: cgUser } : null;
        }
        return copy;
      });
    },
    create: async ({ data }: any) => {
      const a: DBPatientAssignment = { id: cuid(), active: true, createdAt: new Date(), ...data };
      db.patientAssignments.push(a);
      return { ...a };
    },
    deleteMany: async () => {
      db.patientAssignments = [];
      return { count: 0 };
    },
  },

  medication: {
    findFirst: async (args?: { where?: any }) => {
      const m = db.medications.find((x) => matchesWhere(x, args?.where));
      return m ? { ...m } : null;
    },
    findMany: async () => [...db.medications],
    create: async ({ data }: any) => {
      const m: DBMedication = { id: cuid(), ...data };
      db.medications.push(m);
      return { ...m };
    },
    deleteMany: async () => {
      db.medications = [];
      return { count: 0 };
    },
  },

  medicationPlan: {
    findUnique: async (args: { where: { id: string }; include?: any }) => {
      const p = db.medicationPlans.find((x) => x.id === args.where.id);
      if (!p) return null;
      const copy: any = { ...p };
      if (args.include?.medication) copy.medication = db.medications.find((m) => m.id === p.medicationId);
      return copy;
    },
    findMany: async (args?: { where?: any; include?: any }) => {
      const filtered = db.medicationPlans.filter((p) => matchesWhere(p, args?.where));
      return filtered.map((p) => {
        const copy: any = { ...p };
        if (args?.include?.medication) copy.medication = db.medications.find((m) => m.id === p.medicationId);
        return copy;
      });
    },
    create: async ({ data }: any) => {
      const p: DBMedicationPlan = {
        id: cuid(),
        status: "ACTIVE",
        createdAt: new Date(),
        ...data,
      };
      db.medicationPlans.push(p);
      return { ...p };
    },
    deleteMany: async () => {
      db.medicationPlans = [];
      return { count: 0 };
    },
  },

  medicationEvent: {
    findUnique: async (args: { where: { id: string }; include?: any }) => {
      const e = db.medicationEvents.find((x) => x.id === args.where.id);
      if (!e) return null;
      return hydrateMedEvent(e, args.include);
    },
    findFirst: async (args?: { where?: any; include?: any; orderBy?: any }) => {
      let filtered = db.medicationEvents.filter((e) => matchesWhere(e, args?.where));
      filtered = applyOrderBy(filtered, args?.orderBy);
      const e = filtered[0];
      return e ? hydrateMedEvent(e, args?.include) : null;
    },
    findMany: async (args?: { where?: any; include?: any; orderBy?: any }) => {
      let filtered = db.medicationEvents.filter((e) => matchesWhere(e, args?.where));
      filtered = applyOrderBy(filtered, args?.orderBy);
      return filtered.map((e) => hydrateMedEvent(e, args?.include));
    },
    count: async (args?: { where?: any }) => {
      return db.medicationEvents.filter((e) => matchesWhere(e, args?.where)).length;
    },
    create: async ({ data }: any) => {
      const e: DBMedicationEvent = {
        eligibleAt: null,
        notifiedAt: null,
        dispensedAt: null,
        confirmedAt: null,
        missedAt: null,
        failedReason: null,
        delayMinutes: null,
        deviceId: null,
        createdAt: new Date(),
        ...data,
      };
      db.medicationEvents.push(e);
      return { ...e };
    },
    update: async (args: { where: { id: string }; data: any; include?: any }) => {
      const idx = db.medicationEvents.findIndex((x) => x.id === args.where.id);
      if (idx === -1) throw new Error("Event not found");
      db.medicationEvents[idx] = { ...db.medicationEvents[idx], ...args.data };
      return hydrateMedEvent(db.medicationEvents[idx], args.include);
    },
    deleteMany: async () => {
      db.medicationEvents = [];
      return { count: 0 };
    },
  },

  mealSchedule: {
    findMany: async (args?: { where?: any }) => {
      return db.mealSchedules.filter((m) => matchesWhere(m, args?.where)).map((x) => ({ ...x }));
    },
    createMany: async ({ data }: any) => {
      for (const item of data) {
        db.mealSchedules.push({ id: cuid(), active: true, ...item });
      }
      return { count: data.length };
    },
    deleteMany: async () => {
      db.mealSchedules = [];
      return { count: 0 };
    },
  },

  mealEvent: {
    findFirst: async (args?: { where?: any; orderBy?: any }) => {
      let filtered = db.mealEvents.filter((m) => matchesWhere(m, args?.where));
      filtered = applyOrderBy(filtered, args?.orderBy);
      return filtered[0] ? { ...filtered[0] } : null;
    },
    findMany: async (args?: { where?: any; orderBy?: any }) => {
      let filtered = db.mealEvents.filter((m) => matchesWhere(m, args?.where));
      filtered = applyOrderBy(filtered, args?.orderBy);
      return filtered.map((x) => ({ ...x }));
    },
    create: async ({ data }: any) => {
      const m: DBMealEvent = { id: cuid(), notes: "", ...data };
      db.mealEvents.push(m);
      return { ...m };
    },
    createMany: async ({ data }: any) => {
      for (const item of data) {
        db.mealEvents.push({ id: cuid(), notes: "", ...item });
      }
      return { count: data.length };
    },
    deleteMany: async () => {
      db.mealEvents = [];
      return { count: 0 };
    },
  },

  device: {
    findUnique: async (args: { where: { id?: string; serial?: string }; include?: any }) => {
      const d = db.devices.find((x) => (args.where.id ? x.id === args.where.id : x.serial === args.where.serial));
      if (!d) return null;
      return hydrateDevice(d, args.include);
    },
    findFirst: async (args?: { where?: any; include?: any }) => {
      const d = db.devices.find((x) => matchesWhere(x, args?.where));
      if (!d) return null;
      return hydrateDevice(d, args?.include);
    },
    findMany: async (args?: { where?: any; include?: any; orderBy?: any }) => {
      let filtered = db.devices.filter((x) => matchesWhere(x, args?.where));
      filtered = applyOrderBy(filtered, args?.orderBy);
      return filtered.map((d) => hydrateDevice(d, args?.include));
    },
    create: async ({ data }: any) => {
      const { slots, ...deviceData } = data;
      const d: DBDevice = {
        id: cuid(),
        firmware: "sim-0.1.0",
        simState: "ONLINE",
        online: true,
        batteryPct: 84,
        wifiQuality: "Good",
        door: "Closed",
        motor: "Ready",
        sensors: "Normal",
        lastSeenAt: new Date(),
        ...deviceData,
      };
      db.devices.push(d);
      if (slots?.create) {
        for (const slot of slots.create) {
          db.deviceSlots.push({ id: cuid(), deviceId: d.id, ...slot });
        }
      }
      return { ...d };
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const idx = db.devices.findIndex((x) => x.id === args.where.id);
      if (idx === -1) throw new Error("Device not found");
      db.devices[idx] = { ...db.devices[idx], ...args.data };
      return { ...db.devices[idx] };
    },
    deleteMany: async () => {
      db.devices = [];
      return { count: 0 };
    },
  },

  deviceSlot: {
    findFirst: async (args?: { where?: any }) => {
      const s = db.deviceSlots.find((x) => matchesWhere(x, args?.where));
      return s ? { ...s } : null;
    },
    findUnique: async (args: { where: { id: string } }) => {
      const s = db.deviceSlots.find((x) => x.id === args.where.id);
      return s ? { ...s } : null;
    },
    findMany: async (args?: { where?: any }) => {
      return db.deviceSlots.filter((s) => matchesWhere(s, args?.where)).map((x) => ({ ...x }));
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const idx = db.deviceSlots.findIndex((x) => x.id === args.where.id);
      if (idx === -1) throw new Error("Slot not found");
      db.deviceSlots[idx] = { ...db.deviceSlots[idx], ...args.data };
      return { ...db.deviceSlots[idx] };
    },
    deleteMany: async () => {
      db.deviceSlots = [];
      return { count: 0 };
    },
  },

  deviceTelemetry: {
    create: async ({ data }: any) => {
      const t: DBDeviceTelemetry = { id: cuid(), recordedAt: new Date(), ...data };
      db.deviceTelemetries.push(t);
      return { ...t };
    },
    findMany: async (args?: { where?: any; orderBy?: any; take?: number }) => {
      let filtered = db.deviceTelemetries.filter((t) => matchesWhere(t, args?.where));
      filtered = applyOrderBy(filtered, args?.orderBy);
      if (args?.take) filtered = filtered.slice(0, args.take);
      return filtered.map((x) => ({ ...x }));
    },
    deleteMany: async () => {
      db.deviceTelemetries = [];
      return { count: 0 };
    },
  },

  deviceEvent: {
    deleteMany: async () => {
      db.deviceEvents = [];
      return { count: 0 };
    },
  },

  dispensingEvent: {
    findMany: async (args?: { where?: any; include?: any; orderBy?: any; take?: number }) => {
      let filtered = db.dispensingEvents.filter((d) => {
        if (args?.where?.medicationEvent?.patientId) {
          const medEvent = db.medicationEvents.find((e) => e.id === d.medicationEventId);
          if (medEvent?.patientId !== args.where.medicationEvent.patientId) return false;
        }
        return matchesWhere(d, args?.where);
      });
      filtered = applyOrderBy(filtered, args?.orderBy);
      if (args?.take) filtered = filtered.slice(0, args.take);
      return filtered.map((d) => {
        const copy: any = { ...d };
        if (args?.include?.medicationEvent) {
          copy.medicationEvent = db.medicationEvents.find((e) => e.id === d.medicationEventId) || null;
        }
        return copy;
      });
    },
    create: async ({ data }: any) => {
      const d: DBDispensingEvent = { id: cuid(), createdAt: new Date(), ...data };
      db.dispensingEvents.push(d);
      return { ...d };
    },
    deleteMany: async () => {
      db.dispensingEvents = [];
      return { count: 0 };
    },
  },

  healthMeasurement: {
    findMany: async (args?: { where?: any; orderBy?: any; take?: number; include?: any }) => {
      let filtered = db.healthMeasurements.filter((m) => matchesWhere(m, args?.where));
      filtered = applyOrderBy(filtered, args?.orderBy);
      if (args?.take) filtered = filtered.slice(0, args.take);
      return filtered.map((m) => {
        const copy: any = { ...m };
        if (args?.include?.patient) copy.patient = db.patients.find((p) => p.id === m.patientId) || null;
        return copy;
      });
    },
    createMany: async ({ data }: any) => {
      for (const item of data) {
        db.healthMeasurements.push({ id: cuid(), ...item });
      }
      return { count: data.length };
    },
    deleteMany: async () => {
      db.healthMeasurements = [];
      return { count: 0 };
    },
  },

  alert: {
    findFirst: async (args?: { where?: any }) => {
      const a = db.alerts.find((x) => matchesWhere(x, args?.where));
      return a ? { ...a } : null;
    },
    findUnique: async (args: { where: { id: string } }) => {
      const a = db.alerts.find((x) => x.id === args.where.id);
      return a ? { ...a } : null;
    },
    findMany: async (args?: { where?: any; include?: any; orderBy?: any; take?: number }) => {
      let filtered = db.alerts.filter((a) => matchesWhere(a, args?.where));
      filtered = applyOrderBy(filtered, args?.orderBy);
      if (args?.take) filtered = filtered.slice(0, args.take);
      return filtered.map((a) => {
        const copy: any = { ...a };
        if (args?.include?.patient) copy.patient = db.patients.find((p) => p.id === a.patientId) || null;
        return copy;
      });
    },
    create: async ({ data }: any) => {
      const a: DBAlert = { id: cuid(), isDiagnosis: false, acknowledged: false, acknowledgedById: null, createdAt: new Date(), ...data };
      db.alerts.push(a);
      return { ...a };
    },
    createMany: async ({ data }: any) => {
      for (const item of data) {
        db.alerts.push({ id: cuid(), isDiagnosis: false, acknowledged: false, acknowledgedById: null, createdAt: new Date(), ...item });
      }
      return { count: data.length };
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const idx = db.alerts.findIndex((x) => x.id === args.where.id);
      if (idx === -1) throw new Error("Alert not found");
      db.alerts[idx] = { ...db.alerts[idx], ...args.data };
      return { ...db.alerts[idx] };
    },
    deleteMany: async () => {
      db.alerts = [];
      return { count: 0 };
    },
  },

  notification: {
    findMany: async (args?: { where?: any; orderBy?: any; take?: number }) => {
      let filtered = db.notifications.filter((n) => matchesWhere(n, args?.where));
      filtered = applyOrderBy(filtered, args?.orderBy);
      if (args?.take) filtered = filtered.slice(0, args.take);
      return filtered.map((x) => ({ ...x }));
    },
    createMany: async ({ data }: any) => {
      for (const item of data) {
        db.notifications.push({ id: cuid(), read: false, createdAt: new Date(), ...item });
      }
      return { count: data.length };
    },
    deleteMany: async () => {
      db.notifications = [];
      return { count: 0 };
    },
  },

  adherenceRecord: {
    create: async ({ data }: any) => {
      const r: DBAdherenceRecord = { id: cuid(), ...data };
      db.adherenceRecords.push(r);
      return { ...r };
    },
    deleteMany: async (args?: { where?: any }) => {
      db.adherenceRecords = db.adherenceRecords.filter((r) => !matchesWhere(r, args?.where));
      return { count: 0 };
    },
  },

  timelineEvent: {
    findMany: async (args?: { where?: any; orderBy?: any; take?: number }) => {
      let filtered = db.timelineEvents.filter((t) => matchesWhere(t, args?.where));
      filtered = applyOrderBy(filtered, args?.orderBy);
      if (args?.take) filtered = filtered.slice(0, args.take);
      return filtered.map((x) => ({ ...x }));
    },
    create: async ({ data }: any) => {
      const t: DBTimelineEvent = { id: cuid(), ...data };
      db.timelineEvents.push(t);
      return { ...t };
    },
    createMany: async ({ data }: any) => {
      for (const item of data) {
        db.timelineEvents.push({ id: cuid(), ...item });
      }
      return { count: data.length };
    },
    deleteMany: async () => {
      db.timelineEvents = [];
      return { count: 0 };
    },
  },

  clinicalNote: {
    findMany: async (args?: { where?: any; include?: any; orderBy?: any }) => {
      let filtered = db.clinicalNotes.filter((c) => matchesWhere(c, args?.where));
      filtered = applyOrderBy(filtered, args?.orderBy);
      return filtered.map((c) => {
        const copy: any = { ...c };
        if (args?.include?.doctor) {
          const doc = db.doctors.find((d) => d.id === c.doctorId);
          const docUser = doc ? db.users.find((u) => u.id === doc.userId) : null;
          copy.doctor = doc ? { ...doc, user: docUser } : null;
        }
        return copy;
      });
    },
    create: async ({ data }: any) => {
      const n: DBClinicalNote = { id: cuid(), createdAt: new Date(), ...data };
      db.clinicalNotes.push(n);
      return { ...n };
    },
    deleteMany: async () => {
      db.clinicalNotes = [];
      return { count: 0 };
    },
  },

  auditLog: {
    findMany: async (args?: { where?: any; include?: any; orderBy?: any; take?: number }) => {
      let filtered = db.auditLogs.filter((a) => matchesWhere(a, args?.where));
      filtered = applyOrderBy(filtered, args?.orderBy);
      if (args?.take) filtered = filtered.slice(0, args.take);
      return filtered.map((a) => {
        const copy: any = { ...a };
        if (args?.include?.user) copy.user = db.users.find((u) => u.id === a.userId) || null;
        if (args?.include?.patient) copy.patient = db.patients.find((p) => p.id === a.patientId) || null;
        return copy;
      });
    },
    create: async ({ data }: any) => {
      const a: DBAuditLog = {
        id: cuid(),
        userId: null,
        patientId: null,
        previousValue: "",
        newValue: "",
        deviceId: null,
        result: "OK",
        timestamp: new Date(),
        ...data,
      };
      db.auditLogs.push(a);
      return { ...a };
    },
    deleteMany: async () => {
      db.auditLogs = [];
      return { count: 0 };
    },
  },

  systemConfig: {
    create: async ({ data }: any) => {
      const s: DBSystemConfig = { ...data };
      db.systemConfigs.push(s);
      return { ...s };
    },
    deleteMany: async () => {
      db.systemConfigs = [];
      return { count: 0 };
    },
  },
};

function hydratePatient(p: DBPatient, include: any): any {
  const copy: any = { ...p };
  if (include?.assignments) {
    let assignments = db.patientAssignments.filter((a) => a.patientId === p.id);
    if (include.assignments.where) {
      assignments = assignments.filter((a) => matchesWhere(a, include.assignments.where));
    }
    copy.assignments = assignments.map((a) => {
      const aCopy: any = { ...a };
      if (include.assignments.include?.doctor) {
        const doc = db.doctors.find((d) => d.id === a.doctorId);
        aCopy.doctor = doc ? { ...doc, user: db.users.find((u) => u.id === doc.userId) || null } : null;
      }
      if (include.assignments.include?.caregiver) {
        const cg = db.caregivers.find((c) => c.id === a.caregiverId);
        aCopy.caregiver = cg ? { ...cg, user: db.users.find((u) => u.id === cg.userId) || null } : null;
      }
      return aCopy;
    });
  }
  if (include?.alerts) {
    let alerts = db.alerts.filter((a) => a.patientId === p.id);
    if (include.alerts.where) alerts = alerts.filter((a) => matchesWhere(a, include.alerts.where));
    if (include.alerts.orderBy) alerts = applyOrderBy(alerts, include.alerts.orderBy);
    if (include.alerts.take) alerts = alerts.slice(0, include.alerts.take);
    copy.alerts = alerts.map((a) => ({ ...a }));
  }
  if (include?.devices) {
    let devices = db.devices.filter((d) => d.patientId === p.id);
    copy.devices = devices.map((d) => hydrateDevice(d, include.devices.include));
  }
  if (include?.medicationPlans) {
    let plans = db.medicationPlans.filter((m) => m.patientId === p.id);
    if (include.medicationPlans.where) plans = plans.filter((m) => matchesWhere(m, include.medicationPlans.where));
    copy.medicationPlans = plans.map((pl) => {
      const plCopy: any = { ...pl };
      if (include.medicationPlans.include?.medication) {
        plCopy.medication = db.medications.find((med) => med.id === pl.medicationId) || null;
      }
      return plCopy;
    });
  }
  if (include?.medicationEvents) {
    let events = db.medicationEvents.filter((e) => e.patientId === p.id);
    if (include.medicationEvents.where) events = events.filter((e) => matchesWhere(e, include.medicationEvents.where));
    if (include.medicationEvents.orderBy) events = applyOrderBy(events, include.medicationEvents.orderBy);
    copy.medicationEvents = events.map((ev) => hydrateMedEvent(ev, include.medicationEvents.include));
  }
  if (include?.mealSchedules) {
    copy.mealSchedules = db.mealSchedules.filter((m) => m.patientId === p.id).map((x) => ({ ...x }));
  }
  if (include?.mealEvents) {
    let meals = db.mealEvents.filter((m) => m.patientId === p.id);
    if (include.mealEvents.where) meals = meals.filter((m) => matchesWhere(m, include.mealEvents.where));
    if (include.mealEvents.orderBy) meals = applyOrderBy(meals, include.mealEvents.orderBy);
    copy.mealEvents = meals.map((x) => ({ ...x }));
  }
  if (include?.healthMeasurements) {
    let hm = db.healthMeasurements.filter((h) => h.patientId === p.id);
    if (include.healthMeasurements.where) hm = hm.filter((h) => matchesWhere(h, include.healthMeasurements.where));
    if (include.healthMeasurements.orderBy) hm = applyOrderBy(hm, include.healthMeasurements.orderBy);
    if (include.healthMeasurements.take) hm = hm.slice(0, include.healthMeasurements.take);
    copy.healthMeasurements = hm.map((x) => ({ ...x }));
  }
  if (include?.timelineEvents) {
    let tl = db.timelineEvents.filter((t) => t.patientId === p.id);
    if (include.timelineEvents.where) tl = tl.filter((t) => matchesWhere(t, include.timelineEvents.where));
    if (include.timelineEvents.orderBy) tl = applyOrderBy(tl, include.timelineEvents.orderBy);
    if (include.timelineEvents.take) tl = tl.slice(0, include.timelineEvents.take);
    copy.timelineEvents = tl.map((x) => ({ ...x }));
  }
  if (include?.clinicalNotes) {
    let cn = db.clinicalNotes.filter((c) => c.patientId === p.id);
    if (include.clinicalNotes.where) cn = cn.filter((c) => matchesWhere(c, include.clinicalNotes.where));
    if (include.clinicalNotes.orderBy) cn = applyOrderBy(cn, include.clinicalNotes.orderBy);
    copy.clinicalNotes = cn.map((c) => {
      const cCopy: any = { ...c };
      if (include.clinicalNotes.include?.doctor) {
        const doc = db.doctors.find((d) => d.id === c.doctorId);
        cCopy.doctor = doc ? { ...doc, user: db.users.find((u) => u.id === doc.userId) || null } : null;
      }
      return cCopy;
    });
  }
  return copy;
}

function hydrateDevice(d: DBDevice, include: any): any {
  const copy: any = { ...d };
  if (include?.slots) {
    copy.slots = db.deviceSlots.filter((s) => s.deviceId === d.id).map((x) => ({ ...x }));
  }
  if (include?.patient) {
    copy.patient = db.patients.find((p) => p.id === d.patientId) || null;
  }
  if (include?.telemetry) {
    let t = db.deviceTelemetries.filter((x) => x.deviceId === d.id);
    if (include.telemetry.where) t = t.filter((x) => matchesWhere(x, include.telemetry.where));
    if (include.telemetry.orderBy) t = applyOrderBy(t, include.telemetry.orderBy);
    if (include.telemetry.take) t = t.slice(0, include.telemetry.take);
    copy.telemetry = t.map((x) => ({ ...x }));
  }
  if (include?.deviceEvents) {
    copy.deviceEvents = db.deviceEvents.filter((e) => e.deviceId === d.id).map((x) => ({ ...x }));
  }
  return copy;
}

function hydrateMedEvent(e: DBMedicationEvent, include: any): any {
  const copy: any = { ...e };
  if (include?.plan) {
    const pl = db.medicationPlans.find((p) => p.id === e.planId);
    if (pl) {
      const plCopy: any = { ...pl };
      if (include.plan.include?.medication) {
        plCopy.medication = db.medications.find((m) => m.id === pl.medicationId) || null;
      }
      copy.plan = plCopy;
    } else {
      copy.plan = null;
    }
  }
  if (include?.patient) {
    copy.patient = db.patients.find((p) => p.id === e.patientId) || null;
  }
  return copy;
}
