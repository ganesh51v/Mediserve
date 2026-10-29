/**
 * @mediserve/shared-types
 * Authoritative clinical and IoT hardware types for MediServe.
 */

export type Role = "ADMIN" | "DOCTOR" | "CAREGIVER" | "PATIENT";

export type DoseState =
  | "SCHEDULED"
  | "REMINDER_TRIGGERED"
  | "COMPARTMENT_UNLOCKED"
  | "DISPENSING_ATTEMPTED"
  | "PATIENT_CONFIRMED"
  | "VERIFIED_INGESTION"
  | "MISSED"
  | "DELAYED"
  | "FAILED"
  | "CANCELLED";

export type DeviceEventType =
  | "REMINDER_TRIGGERED"
  | "COMPARTMENT_UNLOCKED"
  | "COMPARTMENT_OPENED"
  | "LED_ACTIVATED"
  | "BUZZER_ACTIVATED"
  | "PATIENT_CONFIRMED"
  | "COMPARTMENT_CLOSED"
  | "DISPENSING_ERROR"
  | "DEVICE_OFFLINE"
  | "DEVICE_ONLINE";

export type NotificationChannel = "PUSH" | "SMS" | "EMAIL" | "IN_APP";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  createdAt: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  doctorId?: string;
  caregiverId?: string;
  patientId?: string;
}

export interface PatientProfile {
  id: string;
  userId?: string;
  fullName: string;
  dateOfBirth: string;
  timezone: string;
  primaryPhone?: string;
  emergencyContact?: string;
  assignedDoctorIds: string[];
  assignedCaregiverIds: string[];
  createdAt: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  instructions: string;
  mealRelation: "BEFORE_MEAL" | "WITH_MEAL" | "AFTER_MEAL" | "EMPTY_STOMACH" | "NO_MEAL_DEPENDENCY";
  status: "ACTIVE" | "DISCONTINUED" | "PAUSED";
}

export interface MedicationSchedule {
  id: string;
  medicationId: string;
  patientId: string;
  compartmentId: number; // 1: Morning, 2: Afternoon, 3: Evening, 4: Night
  times: string[]; // ["08:00", "20:00"]
  timezone: string;
  startDate: string;
  endDate?: string | null;
  confirmationWindowMinutes: number; // default: 30 (or 15 for critical)
  active: boolean;
  revision: number;
}

export interface ScheduledDose {
  id: string; // ME-YYYYMMDD-HHMM-NNN
  scheduleId: string;
  patientId: string;
  medicationId: string;
  medicationName: string;
  compartmentId: number;
  scheduledAt: string; // ISO UTC
  state: DoseState;
  eligibleAt?: string | null;
  reminderSentAt?: string | null;
  openedAt?: string | null;
  confirmedAt?: string | null;
  missedAt?: string | null;
  delayMinutes: number;
  idempotencyKey: string;
}

export interface Compartment {
  id: string;
  deviceId: string;
  compartmentNumber: number; // 1, 2, 3, 4
  label: "Morning" | "Afternoon" | "Evening" | "Night" | string;
  status: "LOCKED" | "OPEN" | "JAMMED" | "REFILLING";
  ledState: "OFF" | "BLINKING_AMBER" | "SOLID_GREEN" | "ERROR_RED";
  buzzerActive: boolean;
  stockCount: number;
}

export interface Device {
  id: string;
  patientId?: string | null;
  serialNumber: string;
  deviceType: "SIMULATOR" | "PHYSICAL_ESP32";
  connectionStatus: "ONLINE" | "OFFLINE" | "DEGRADED";
  batteryPct: number;
  wifiQuality: string;
  firmwareVersion: string;
  lastSeenAt: string;
  compartments: Compartment[];
}

export interface IngestedDeviceEvent {
  eventId: string;
  deviceId: string;
  compartmentId: number | string;
  doseId?: string;
  eventType: DeviceEventType;
  occurredAt: string;
  source: "SIMULATOR" | "ESP32_HARDWARE";
  metadata?: Record<string, unknown>;
}

export interface NotificationRecord {
  id: string;
  doseId?: string;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  status: "PENDING" | "DELIVERED" | "FAILED" | "RETRIED";
  retryCount: number;
  read: boolean;
  sentAt?: string | null;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  createdAt: string;
}

export interface AdherenceMetrics {
  patientId: string;
  periodStart: string;
  periodEnd: string;
  eligibleDoses: number;
  confirmedDoses: number;
  verifiedIngestionDoses: number;
  missedDoses: number;
  delayedDoses: number;
  uncertainDoses: number;
  adherenceRatePct: number;
  dataCompletenessPct: number;
  statusBreakdown: Record<DoseState, number>;
}

