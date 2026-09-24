-- MediServe Relational Database Schema
-- Compatible with SQLite and PostgreSQL

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'doctor', 'caretaker')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
    specialization TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    patient_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    gender TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    emergency_contact TEXT NOT NULL,
    emergency_phone TEXT NOT NULL,
    blood_group TEXT,
    allergies TEXT,
    medical_conditions TEXT,
    doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    caretaker_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'online' CHECK(status IN ('online', 'warning', 'offline')),
    battery_level INTEGER NOT NULL DEFAULT 100,
    signal_strength TEXT DEFAULT 'strong',
    firmware_version TEXT NOT NULL DEFAULT 'v2.4.1',
    last_seen TEXT NOT NULL,
    compartments_json TEXT NOT NULL DEFAULT '[]',
    dispensing_status TEXT DEFAULT 'idle',
    last_dispense_time TEXT,
    error_message TEXT,
    device_token TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    medicine_type TEXT NOT NULL DEFAULT 'Tablet',
    dosage TEXT NOT NULL,
    current_quantity INTEGER NOT NULL DEFAULT 30,
    initial_quantity INTEGER NOT NULL DEFAULT 30,
    refill_threshold INTEGER NOT NULL DEFAULT 5,
    frequency TEXT NOT NULL,
    meal_relation TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    instructions TEXT,
    special_precautions TEXT,
    storage_info TEXT DEFAULT 'Store in a cool, dry place',
    expiry_date TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'discontinued')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS medication_schedules (
    id TEXT PRIMARY KEY,
    medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    scheduled_time TEXT NOT NULL,
    meal_relation TEXT NOT NULL,
    days_of_week TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS medication_events (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    schedule_id TEXT REFERENCES medication_schedules(id) ON DELETE SET NULL,
    device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
    scheduled_time TEXT NOT NULL,
    dispensed_at TEXT,
    taken_at TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'dispensing', 'dispensed', 'taken', 'missed', 'delayed', 'skipped')),
    meal_context TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK(type IN ('medication_missed', 'device_offline', 'refill_required', 'dispenser_error', 'emergency', 'meal_delayed')),
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread', 'read', 'acknowledged', 'resolved')),
    acknowledged_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS health_records (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    blood_pressure_sys INTEGER,
    blood_pressure_dia INTEGER,
    heart_rate INTEGER,
    blood_glucose REAL,
    temperature REAL,
    oxygen_saturation INTEGER,
    notes TEXT,
    recorded_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_doctor ON patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_caretaker ON patients(caretaker_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_schedules_patient ON medication_schedules(patient_id);
CREATE INDEX IF NOT EXISTS idx_events_patient ON medication_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON medication_events(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_alerts_patient ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_health_patient ON health_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_devices_patient ON devices(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
