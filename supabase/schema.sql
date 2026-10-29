-- ==============================================================================
-- MediServe Supabase PostgreSQL Schema
-- Meal-Aware Medication Dispensing & Telehealth Platform
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'DOCTOR', 'CAREGIVER')),
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Doctors Table
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  npi TEXT,
  license_number TEXT,
  issuing_authority TEXT,
  specialty TEXT NOT NULL,
  hospital_affiliation TEXT,
  years_of_practice INT DEFAULT 0
);

-- 3. Caregivers Table
CREATE TABLE IF NOT EXISTS public.caregivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  certifications TEXT,
  years_of_experience INT DEFAULT 0,
  types_of_care TEXT,
  availability TEXT
);

-- 4. Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mrn TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  sex TEXT NOT NULL,
  emergency_name TEXT NOT NULL,
  emergency_phone TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Patient Assignments Table (Cross-Care Team Link)
CREATE TABLE IF NOT EXISTS public.patient_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  caregiver_id UUID REFERENCES public.caregivers(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Medications Catalog
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  form TEXT NOT NULL,
  strength TEXT NOT NULL
);

-- 7. Medication Plans
CREATE TABLE IF NOT EXISTS public.medication_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE RESTRICT,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  scheduled_time TEXT NOT NULL,
  meal_relationship TEXT NOT NULL DEFAULT 'NO_MEAL_DEPENDENCY' 
    CHECK (meal_relationship IN ('NO_MEAL_DEPENDENCY', 'BEFORE_MEAL', 'WITH_MEAL', 'AFTER_MEAL', 'EMPTY_STOMACH')),
  meal_kind TEXT CHECK (meal_kind IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK') OR meal_kind IS NULL),
  instructions TEXT NOT NULL DEFAULT '',
  device_slot INT NOT NULL DEFAULT 1 CHECK (device_slot BETWEEN 1 AND 4),
  authorized_by UUID NOT NULL REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'DISCONTINUED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Hardware Devices
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serial TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  firmware TEXT NOT NULL DEFAULT 'sim-0.1.0',
  sim_state TEXT NOT NULL DEFAULT 'READY' 
    CHECK (sim_state IN ('ONLINE', 'OFFLINE', 'READY', 'DISPENSING', 'DISPENSED', 'JAMMED', 'LOW_STOCK', 'LOW_BATTERY', 'SENSOR_ERROR')),
  online BOOLEAN NOT NULL DEFAULT true,
  battery_pct INT NOT NULL DEFAULT 100 CHECK (battery_pct BETWEEN 0 AND 100),
  wifi_quality TEXT NOT NULL DEFAULT 'Good',
  door TEXT NOT NULL DEFAULT 'Closed',
  motor TEXT NOT NULL DEFAULT 'Ready',
  sensors TEXT NOT NULL DEFAULT 'Normal',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Device Carousel Slots
CREATE TABLE IF NOT EXISTS public.device_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  slot_index INT NOT NULL CHECK (slot_index BETWEEN 1 AND 4),
  stock TEXT NOT NULL DEFAULT 'GOOD' CHECK (stock IN ('GOOD', 'LOW', 'EMPTY')),
  count INT NOT NULL DEFAULT 10 CHECK (count >= 0),
  UNIQUE (device_id, slot_index)
);

-- 10. Medication Events (Deterministic Dispensing State Machine)
CREATE TABLE IF NOT EXISTS public.medication_events (
  id TEXT PRIMARY KEY, -- Deterministic ID: ME-YYYYMMDD-HHMM-NNN
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.medication_plans(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  state TEXT NOT NULL DEFAULT 'PENDING' 
    CHECK (state IN ('PENDING', 'ELIGIBLE', 'NOTIFIED', 'DISPENSING', 'CONFIRMED', 'MISSED', 'FAILED')),
  eligible_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  dispensed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  missed_at TIMESTAMPTZ,
  failed_reason TEXT,
  delay_minutes INT,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Meal Schedules & Meal Events
CREATE TABLE IF NOT EXISTS public.meal_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')),
  typical_time TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.meal_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')),
  event_type TEXT NOT NULL CHECK (event_type IN ('REPORTED', 'CONFIRMED', 'SENSOR_DETECTED', 'SKIPPED')),
  source TEXT NOT NULL DEFAULT 'caregiver',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Alerts & Notifications
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('MEDICATION', 'DEVICE', 'ADHERENCE', 'HEALTH')),
  priority TEXT NOT NULL CHECK (priority IN ('URGENT', 'WARNING', 'INFO')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('PUSH', 'EMAIL', 'SMS')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  delivered BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Clinical Notes & Timeline
CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  source TEXT NOT NULL
);

-- 14. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  old_value TEXT,
  new_value TEXT,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  result TEXT NOT NULL DEFAULT 'OK'
);

-- 15. Health Measurements
CREATE TABLE IF NOT EXISTS public.health_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RECORDED' CHECK (status IN ('RECORDED', 'REQUIRES_REVIEW', 'NORMAL')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- Row-Level Security (RLS) Configuration
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Service Role (Backend API) has full bypass access
CREATE POLICY "Service role full access on users" ON public.users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on patients" ON public.patients FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on plans" ON public.medication_plans FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on events" ON public.medication_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on alerts" ON public.alerts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on audit_logs" ON public.audit_logs FOR ALL USING (auth.role() = 'service_role');

-- Authenticated Users: View assigned patients
CREATE POLICY "Users can view assigned patients" ON public.patients FOR SELECT USING (
  id IN (
    SELECT patient_id FROM public.patient_assignments pa
    WHERE (pa.doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()))
       OR (pa.caregiver_id IN (SELECT id FROM public.caregivers WHERE user_id = auth.uid()))
  )
);
