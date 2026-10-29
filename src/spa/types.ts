export type Role = "ADMIN" | "DOCTOR" | "CAREGIVER";
export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  verificationStatus?: VerificationStatus;
  isVerified?: boolean;
  doctorId?: string;
  caregiverId?: string;
};

export type Patient = {
  id: string;
  mrn: string;
  name: string;
  dateOfBirth: string;
  emergencyName: string;
  emergencyPhone: string;
  createdAt: string;
  assignments?: PatientAssignment[];
  devices?: Device[];
  medicationPlans?: MedicationPlan[];
  medicationEvents?: MedicationEvent[];
  mealEvents?: MealEvent[];
  mealSchedules?: MealSchedule[];
  alerts?: Alert[];
  healthMeasurements?: HealthMeasurement[];
  timelineEvents?: TimelineEvent[];
  clinicalNotes?: ClinicalNote[];
};

export type PatientAssignment = {
  id: string;
  patientId: string;
  doctorId: string | null;
  caregiverId: string | null;
  active: boolean;
  doctor?: { id: string; user: { name: string } };
  caregiver?: { id: string; user: { name: string } };
};

export type DeviceSlot = {
  id: string;
  deviceId: string;
  slotIndex: number;
  stock: string;
  count: number;
};

export type DeviceTelemetry = {
  id: string;
  deviceId: string;
  recordedAt: string;
  batteryPct: number;
  wifiRssi: number;
  online: boolean;
};

export type Device = {
  id: string;
  serial: string;
  patientId: string | null;
  online: boolean;
  simState: string;
  firmware: string;
  batteryPct: number;
  wifiQuality: string;
  door: string;
  motor: string;
  sensors: string;
  lastSeenAt: string;
  patient?: Patient;
  slots: DeviceSlot[];
  telemetry?: DeviceTelemetry[];
};

export type Medication = {
  id: string;
  name: string;
  form: string;
  strength: string;
};

export type MedicationPlan = {
  id: string;
  patientId: string;
  medicationId: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string | null;
  scheduledTime: string;
  mealRelationship: string;
  mealKind: string | null;
  instructions: string;
  deviceSlot: number;
  status: string;
  medication: Medication;
};

export type MedicationEvent = {
  id: string;
  patientId: string;
  planId: string;
  scheduledAt: string;
  state: string;
  dispensedAt: string | null;
  confirmedAt: string | null;
  missedAt: string | null;
  delayMinutes: number | null;
  plan: MedicationPlan;
  patient?: Patient;
};

export type MealEvent = {
  id: string;
  patientId: string;
  kind: string;
  eventType: string;
  source: string;
  occurredAt: string;
};

export type MealSchedule = {
  id: string;
  patientId: string;
  kind: string;
  targetTime: string;
};

export type Alert = {
  id: string;
  patientId: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  acknowledged: boolean;
  createdAt: string;
  patient: { name: string };
};

export type Notification = {
  id: string;
  userId: string;
  channel: string;
  title: string;
  body: string;
  createdAt: string;
};

export type HealthMeasurement = {
  id: string;
  patientId: string;
  type: string;
  value: string;
  unit: string;
  source: string;
  status: string;
  recordedAt: string;
};

export type TimelineEvent = {
  id: string;
  patientId: string;
  occurredAt: string;
  title: string;
  detail: string;
  source: string;
};

export type ClinicalNote = {
  id: string;
  patientId: string;
  doctorId: string;
  body: string;
  createdAt: string;
  doctor: { user: { name: string } };
};

export type AuditLog = {
  id: string;
  timestamp: string;
  userId: string | null;
  role: string;
  action: string;
  patientId: string | null;
  deviceId: string | null;
  previousValue: string | null;
  newValue: string | null;
  result: string;
  user?: { name: string } | null;
  patient?: { name: string } | null;
};
