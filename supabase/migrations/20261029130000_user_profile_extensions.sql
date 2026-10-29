-- ==============================================================================
-- Migration: User Profile Extensions & Clinical Identity Governance
-- Description: Ensures full support for extended profile attributes across
--              Users, Doctors, and Caregivers with audit logging and constraints.
-- ==============================================================================

-- 1. Ensure phone and profile fields exist on public.users
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Ensure doctor credentials columns exist on public.doctors
ALTER TABLE IF EXISTS public.doctors
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS issuing_authority TEXT,
  ADD COLUMN IF NOT EXISTS hospital_affiliation TEXT,
  ADD COLUMN IF NOT EXISTS years_of_practice INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS npi TEXT;

-- 3. Ensure caregiver professional fields exist on public.caregivers
ALTER TABLE IF EXISTS public.caregivers
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS certifications TEXT,
  ADD COLUMN IF NOT EXISTS years_of_experience INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS types_of_care TEXT,
  ADD COLUMN IF NOT EXISTS availability TEXT;

-- 4. Unique normalized email index
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON public.users (lower(email));

-- 5. Profile Update Audit Action Trigger Function
CREATE OR REPLACE FUNCTION log_user_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.name IS DISTINCT FROM NEW.name OR OLD.email IS DISTINCT FROM NEW.email OR OLD.phone IS DISTINCT FROM NEW.phone) THEN
    INSERT INTO public.audit_logs (
      id,
      user_id,
      role,
      action,
      previous_value,
      new_value,
      result,
      timestamp
    ) VALUES (
      'audit_' || floor(extract(epoch from now()) * 1000)::text,
      NEW.id,
      NEW.role,
      'USER_PROFILE_UPDATED',
      json_build_object('name', OLD.name, 'email', OLD.email, 'phone', OLD.phone)::text,
      json_build_object('name', NEW.name, 'email', NEW.email, 'phone', NEW.phone)::text,
      'SUCCESS',
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Attach trigger conditionally
DROP TRIGGER IF EXISTS trg_log_user_profile_update ON public.users;
CREATE TRIGGER trg_log_user_profile_update
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_profile_update();

