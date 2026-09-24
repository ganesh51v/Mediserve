export type UserRole = 'admin' | 'doctor' | 'caretaker';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password_hash?: string;
  role: UserRole;
  status: UserStatus;
  specialization?: string;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  patient_code: string;
  name: string;
  date_of_birth: string;
  gender: string;
  phone?: string;
  address?: string;
  emergency_contact: string;
  emergency_phone: string;
  blood_group?: string;
  allergies?: string;
  medical_conditions?: string;
  doctor_id?: string;
  caretaker_id?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  // Joins
  doctor_name?: string;
  caretaker_name?: string;
  device_id?: string;
  device_status?: DeviceStatus;
}

export type MedicationType = 'Tablet' | 'Capsule' | 'Liquid' | 'Injection' | 'Inhaler' | 'Topical';

export type MealRelation =
  | 'Before Breakfast'
  | 'After Breakfast'
  | 'Before Lunch'
  | 'After Lunch'
  | 'Before Dinner'
  | 'After Dinner'
  | 'With Meal'
  | 'Empty Stomach'
  | 'Custom Time';

export type MedicationStatus = 'active' | 'completed' | 'discontinued';

export interface Medication {
  id: string;
  patient_id: string;
  doctor_id?: string;
  name: string;
  medicine_type: MedicationType;
  dosage: string;
  current_quantity: number;
  initial_quantity: number;
  refill_threshold: number;
  frequency: string;
  meal_relation: MealRelation;
  scheduled_time: string;
  start_date: string;
  end_date?: string;
  instructions?: string;
  special_precautions?: string;
  storage_info?: string;
  expiry_date?: string;
  status: MedicationStatus;
  created_at: string;
  updated_at: string;
  // Joins
  patient_name?: string;
  doctor_name?: string;
}

export interface MedicationSchedule {
  id: string;
  medication_id: string;
  patient_id: string;
  scheduled_time: string;
  meal_relation: MealRelation;
  days_of_week: string;
  active: number;
  created_at: string;
  // Joins
  medication_name?: string;
  dosage?: string;
}

export type DoseStatus =
  | 'pending'
  | 'dispensing'
  | 'dispensed'
  | 'taken'
  | 'missed'
  | 'delayed'
  | 'skipped';

export interface MedicationEvent {
  id: string;
  patient_id: string;
  medication_id: string;
  schedule_id?: string;
  device_id?: string;
  scheduled_time: string;
  dispensed_at?: string;
  taken_at?: string;
  status: DoseStatus;
  meal_context?: string;
  notes?: string;
  created_at: string;
  // Joins
  patient_name?: string;
  medication_name?: string;
  dosage?: string;
  meal_relation?: MealRelation;
}

export type DeviceStatus = 'online' | 'warning' | 'offline';
export type DispensingStatus = 'idle' | 'dispensing' | 'error' | 'jammed';

export interface DeviceCompartment {
  compartment: number;
  medication_id?: string;
  medication_name?: string;
  capacity: number;
  pills_remaining: number;
}

export interface Device {
  id: string;
  device_id: string;
  patient_id?: string;
  status: DeviceStatus;
  battery_level: number;
  signal_strength: string;
  firmware_version: string;
  last_seen: string;
  compartments_json: string;
  dispensing_status: DispensingStatus;
  last_dispense_time?: string;
  error_message?: string;
  device_token: string;
  created_at: string;
  updated_at: string;
  // Joins
  patient_name?: string;
  patient_code?: string;
}

export type AlertType =
  | 'medication_missed'
  | 'device_offline'
  | 'refill_required'
  | 'dispenser_error'
  | 'emergency'
  | 'meal_delayed';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'unread' | 'read' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  patient_id?: string;
  device_id?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: AlertStatus;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  created_at: string;
  // Joins
  patient_name?: string;
  patient_code?: string;
  acknowledged_by_name?: string;
}

export interface HealthRecord {
  id: string;
  patient_id: string;
  recorded_by?: string;
  blood_pressure_sys?: number;
  blood_pressure_dia?: number;
  heart_rate?: number;
  blood_glucose?: number;
  temperature?: number;
  oxygen_saturation?: number;
  notes?: string;
  recorded_at: string;
  created_at: string;
  // Joins
  recorded_by_name?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
  // Joins
  user_name?: string;
  user_email?: string;
  user_role?: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}
