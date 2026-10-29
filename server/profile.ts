import { Router, Request, Response } from "express";
import { db, DBUser, DBDoctor, DBCaregiver } from "../src/lib/db";
import {
  extractRequestToken,
  verifySessionToken,
  signSessionToken,
  setSessionCookie,
  checkCsrf,
  validateEmail,
  validatePhone,
  SessionPayload,
} from "./auth";

export const profileRouter = Router();

export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  verificationStatus: string;
  isVerified: boolean;
  createdAt: Date | string;
  doctor?: {
    id: string;
    specialty: string;
    licenseNumber?: string;
    issuingAuthority?: string;
    hospitalAffiliation?: string;
    yearsOfPractice?: number;
    npi?: string;
  };
  caregiver?: {
    id: string;
    phone: string;
    certifications?: string;
    yearsOfExperience?: number;
    typesOfCare?: string;
    availability?: string;
  };
}

/**
 * Helper to construct the unified profile representation from DB entities
 */
export function buildProfileResponse(
  user: DBUser,
  doctor?: DBDoctor,
  caregiver?: DBCaregiver
): UserProfileResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || caregiver?.phone,
    role: user.role,
    verificationStatus: user.verificationStatus ?? "APPROVED",
    isVerified: user.isVerified ?? true,
    createdAt: user.createdAt,
    doctor: doctor
      ? {
          id: doctor.id,
          specialty: doctor.specialty,
          licenseNumber: doctor.licenseNumber,
          issuingAuthority: doctor.issuingAuthority,
          hospitalAffiliation: doctor.hospitalAffiliation,
          yearsOfPractice: doctor.yearsOfPractice,
          npi: doctor.npi,
        }
      : undefined,
    caregiver: caregiver
      ? {
          id: caregiver.id,
          phone: caregiver.phone,
          certifications: caregiver.certifications,
          yearsOfExperience: caregiver.yearsOfExperience,
          typesOfCare: caregiver.typesOfCare,
          availability: caregiver.availability,
        }
      : undefined,
  };
}

/**
 * GET Profile: Retrieves the authenticated user's own profile
 */
export async function handleGetProfile(req: Request, res: Response): Promise<void> {
  const token = extractRequestToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthenticated: Valid session token required." });
    return;
  }

  const session = await verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
    return;
  }

  // Cross-user query protection: if an explicit userId was requested, strictly verify it matches the session
  const requestedUserId = req.params?.id || (req.query?.userId as string);
  if (requestedUserId && requestedUserId !== session.id) {
    res.status(403).json({
      error: "Access denied: You are not authorized to view another user's profile.",
    });
    return;
  }

  const user = db.users.find((u) => u.id === session.id);
  if (!user) {
    res.status(404).json({ error: "User account not found." });
    return;
  }

  const doctor = db.doctors.find((d) => d.userId === user.id);
  const caregiver = db.caregivers.find((c) => c.userId === user.id);

  const profile = buildProfileResponse(user, doctor, caregiver);
  res.json({ ok: true, profile });
}

/**
 * PUT/PATCH Profile: Updates the authenticated user's own profile
 * Enforces server-side authority, strict ownership, input validation, and email uniqueness.
 */
export async function handleUpdateProfile(req: Request, res: Response): Promise<void> {
  // 1. CSRF Verification for state mutation requests
  const csrf = checkCsrf(req);
  if (!csrf.safe) {
    res.status(403).json({ error: csrf.reason || "Forbidden: CSRF validation failed." });
    return;
  }

  // 2. Authentication Verification
  const token = extractRequestToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthenticated: Sign-in required." });
    return;
  }

  const session = await verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
    return;
  }

  // 3. Strict Authorization Enforcement: Cannot edit another user's profile
  const targetId = req.params?.id || req.body?.id || req.body?.userId;
  if (targetId && targetId !== session.id) {
    res.status(403).json({
      error: "Access denied: You are not authorized to modify another user's profile.",
    });
    return;
  }

  const user = db.users.find((u) => u.id === session.id);
  if (!user) {
    res.status(404).json({ error: "User account not found." });
    return;
  }

  // 4. Server-Side Validation & Input Sanitization
  const errors: Record<string, string> = {};
  const {
    name,
    email,
    phone,
    specialty,
    licenseNumber,
    issuingAuthority,
    hospitalAffiliation,
    yearsOfPractice,
    certifications,
    yearsOfExperience,
    typesOfCare,
    availability,
  } = req.body || {};

  // Validate Name
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      errors.name = "Full legal name is required.";
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters.";
    } else if (name.trim().length > 100) {
      errors.name = "Name cannot exceed 100 characters.";
    }
  }

  // Validate Email
  let cleanEmail = user.email;
  if (email !== undefined) {
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      errors.email = emailCheck.error || "Please provide a valid email address.";
    } else {
      cleanEmail = emailCheck.email!;
      // Uniqueness check: reject if another user already owns this email address
      const duplicate = db.users.find(
        (u) => u.email.toLowerCase() === cleanEmail.toLowerCase() && u.id !== user.id
      );
      if (duplicate) {
        errors.email = "This email address is already in use by another account.";
      }
    }
  }

  // Validate Phone
  let cleanPhone = user.phone;
  if (phone !== undefined && phone !== null && String(phone).trim() !== "") {
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      errors.phone = phoneCheck.error || "Please enter a valid phone number.";
    } else {
      cleanPhone = phoneCheck.phone!;
    }
  } else if (phone === "") {
    cleanPhone = undefined;
  }

  // Validate Doctor-specific attributes
  if (user.role === "DOCTOR") {
    if (specialty !== undefined && typeof specialty === "string" && specialty.trim().length > 120) {
      errors.specialty = "Specialty description cannot exceed 120 characters.";
    }
    if (hospitalAffiliation !== undefined && typeof hospitalAffiliation === "string" && hospitalAffiliation.trim().length > 150) {
      errors.hospitalAffiliation = "Hospital affiliation cannot exceed 150 characters.";
    }
    if (yearsOfPractice !== undefined && yearsOfPractice !== null && yearsOfPractice !== "") {
      const yrs = Number(yearsOfPractice);
      if (isNaN(yrs) || yrs < 0 || yrs > 75) {
        errors.yearsOfPractice = "Years of practice must be a number between 0 and 75.";
      }
    }
  }

  // Validate Caregiver-specific attributes
  if (user.role === "CAREGIVER") {
    if (certifications !== undefined && typeof certifications === "string" && certifications.trim().length > 255) {
      errors.certifications = "Certifications text cannot exceed 255 characters.";
    }
    if (typesOfCare !== undefined && typeof typesOfCare === "string" && typesOfCare.trim().length > 255) {
      errors.typesOfCare = "Types of care cannot exceed 255 characters.";
    }
    if (yearsOfExperience !== undefined && yearsOfExperience !== null && yearsOfExperience !== "") {
      const exp = Number(yearsOfExperience);
      if (isNaN(exp) || exp < 0 || exp > 75) {
        errors.yearsOfExperience = "Years of experience must be a number between 0 and 75.";
      }
    }
  }

  // Return validation failure with field-level breakdown
  if (Object.keys(errors).length > 0) {
    const statusCode = errors.email === "This email address is already in use by another account." ? 409 : 400;
    res.status(statusCode).json({
      ok: false,
      error: "Validation failed. Please correct the highlighted errors.",
      errors,
    });
    return;
  }

  // 5. Persist Updates to Data Layer
  const previousState = {
    name: user.name,
    email: user.email,
    phone: user.phone,
  };

  if (name !== undefined) user.name = name.trim();
  if (email !== undefined) user.email = cleanEmail;
  user.phone = cleanPhone;

  // Persist role extensions
  let doctor = db.doctors.find((d) => d.userId === user.id);
  if (user.role === "DOCTOR") {
    if (!doctor) {
      doctor = {
        id: `doc_${Date.now()}`,
        userId: user.id,
        specialty: specialty ? String(specialty).trim() : "General Practice",
      };
      db.doctors.push(doctor);
    }
    if (specialty !== undefined) doctor.specialty = String(specialty).trim();
    if (licenseNumber !== undefined) doctor.licenseNumber = String(licenseNumber).trim();
    if (issuingAuthority !== undefined) doctor.issuingAuthority = String(issuingAuthority).trim();
    if (hospitalAffiliation !== undefined) doctor.hospitalAffiliation = String(hospitalAffiliation).trim();
    if (yearsOfPractice !== undefined) doctor.yearsOfPractice = Number(yearsOfPractice) || 0;
  }

  let caregiver = db.caregivers.find((c) => c.userId === user.id);
  if (user.role === "CAREGIVER") {
    if (!caregiver) {
      caregiver = {
        id: `cg_${Date.now()}`,
        userId: user.id,
        phone: cleanPhone || "+1-555-0199",
      };
      db.caregivers.push(caregiver);
    }
    if (cleanPhone) caregiver.phone = cleanPhone;
    if (certifications !== undefined) caregiver.certifications = String(certifications).trim();
    if (yearsOfExperience !== undefined) caregiver.yearsOfExperience = Number(yearsOfExperience) || 0;
    if (typesOfCare !== undefined) caregiver.typesOfCare = String(typesOfCare).trim();
    if (availability !== undefined) caregiver.availability = String(availability).trim();
  }

  // 6. Record Audit Log (21 CFR Part 11 compliant event tracking)
  db.auditLogs.push({
    id: `audit_${Date.now()}`,
    userId: user.id,
    role: user.role,
    patientId: null,
    action: "USER_PROFILE_UPDATED",
    previousValue: JSON.stringify(previousState),
    newValue: JSON.stringify({ name: user.name, email: user.email, phone: user.phone }),
    deviceId: null,
    result: "SUCCESS",
    timestamp: new Date(),
  });

  // 7. Re-issue updated session token and refreshed cookie
  const updatedSessionPayload: SessionPayload = {
    id: user.id,
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    verificationStatus: user.verificationStatus ?? "APPROVED",
    isVerified: user.isVerified ?? true,
    doctorId: doctor?.id,
    caregiverId: caregiver?.id,
  };

  const newToken = await signSessionToken(updatedSessionPayload);
  setSessionCookie(res, newToken, req);

  const updatedProfile = buildProfileResponse(user, doctor, caregiver);

  res.json({
    ok: true,
    message: "Profile updated successfully.",
    user: updatedSessionPayload,
    profile: updatedProfile,
    token: newToken,
  });
}

// Router configuration
profileRouter.get("/", handleGetProfile);
profileRouter.put("/", handleUpdateProfile);
profileRouter.patch("/", handleUpdateProfile);

profileRouter.get("/:id", handleGetProfile);
profileRouter.put("/:id", handleUpdateProfile);
profileRouter.patch("/:id", handleUpdateProfile);

