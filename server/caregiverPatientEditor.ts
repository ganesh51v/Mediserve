import { Router, Request, Response } from "express";
import { db, DBPatient } from "../src/lib/db";
import {
  extractRequestToken,
  verifySessionToken,
  checkCsrf,
  validatePhone,
} from "./auth";

export const caregiverPatientEditorRouter = Router();

export interface PatientDetailsPayload {
  id: string;
  mrn: string;
  name: string;
  dateOfBirth: string | Date;
  sex: string;
  emergencyName: string;
  emergencyPhone: string;
  notes: string;
}

/**
 * Validates whether the authenticated session has caregiver authorization for the given patient.
 * Caregivers must have an active assignment to the patient.
 * Admins have administrative override permissions.
 */
export function isCaregiverAuthorizedForPatient(sessionUserId: string, sessionRole: string, patientId: string): boolean {
  if (sessionRole === "ADMIN") return true;
  if (sessionRole !== "CAREGIVER") return false;

  const caregiver = db.caregivers.find((c) => c.userId === sessionUserId);
  if (!caregiver) return false;

  return db.patientAssignments.some(
    (a) => a.active && a.patientId === patientId && a.caregiverId === caregiver.id
  );
}

/**
 * GET /api/caregiver/assigned-patients
 * Returns all active patients assigned to the authenticated caregiver
 */
export async function handleGetAssignedPatients(req: Request, res: Response): Promise<void> {
  const token = extractRequestToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthenticated: Sign-in required." });
    return;
  }

  const session = await verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: "Session expired or invalid." });
    return;
  }

  let accessiblePatients: DBPatient[] = [];
  if (session.role === "ADMIN") {
    accessiblePatients = db.patients;
  } else if (session.role === "CAREGIVER") {
    const caregiver = db.caregivers.find((c) => c.userId === session.id);
    if (!caregiver) {
      res.json({ ok: true, patients: [] });
      return;
    }
    const assignedIds = new Set(
      db.patientAssignments
        .filter((a) => a.active && a.caregiverId === caregiver.id)
        .map((a) => a.patientId)
    );
    accessiblePatients = db.patients.filter((p) => assignedIds.has(p.id));
  } else {
    res.status(403).json({ error: "Forbidden: Caregiver or Admin role required." });
    return;
  }

  res.json({
    ok: true,
    patients: accessiblePatients.map((p) => ({
      id: p.id,
      mrn: p.mrn,
      name: p.name,
      dateOfBirth: p.dateOfBirth,
      sex: p.sex,
      emergencyName: p.emergencyName,
      emergencyPhone: p.emergencyPhone,
      notes: p.notes,
    })),
  });
}

/**
 * GET /api/caregiver/patient-details/:id
 * Loads current stored patient details with caregiver assignment verification
 */
export async function handleGetCaregiverPatient(req: Request, res: Response): Promise<void> {
  const token = extractRequestToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthenticated: Sign-in required." });
    return;
  }

  const session = await verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: "Session expired or invalid." });
    return;
  }

  const patientId = req.params.id;
  if (!patientId) {
    res.status(400).json({ error: "Patient identifier is required." });
    return;
  }

  // Authorization enforcement: caregiver must be assigned to this patient
  const authorized = isCaregiverAuthorizedForPatient(session.id, session.role, patientId);
  if (!authorized) {
    res.status(403).json({ error: "Access denied. You are not assigned to manage this patient." });
    return;
  }

  const patient = db.patients.find((p) => p.id === patientId);
  if (!patient) {
    res.status(404).json({ error: "Patient record not found." });
    return;
  }

  res.json({
    ok: true,
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      name: patient.name,
      dateOfBirth: patient.dateOfBirth instanceof Date ? patient.dateOfBirth.toISOString().split("T")[0] : String(patient.dateOfBirth),
      sex: patient.sex || "Undisclosed",
      emergencyName: patient.emergencyName || "",
      emergencyPhone: patient.emergencyPhone || "",
      notes: patient.notes || "",
    },
  });
}

/**
 * PUT/PATCH /api/caregiver/patient-details/:id
 * Saves patient modifications with server-side validation and authorization enforcement
 */
export async function handleUpdateCaregiverPatient(req: Request, res: Response): Promise<void> {
  // 1. CSRF Protection for state mutation
  const csrf = checkCsrf(req);
  if (!csrf.safe) {
    res.status(403).json({ error: csrf.reason || "Forbidden: CSRF check failed." });
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
    res.status(401).json({ error: "Session expired or invalid." });
    return;
  }

  const patientId = req.params.id;
  if (!patientId) {
    res.status(400).json({ error: "Patient identifier is required." });
    return;
  }

  // 3. Authorization Enforcement (server-side authority)
  const authorized = isCaregiverAuthorizedForPatient(session.id, session.role, patientId);
  if (!authorized) {
    res.status(403).json({ error: "Access denied. You are not assigned to manage this patient." });
    return;
  }

  const patient = db.patients.find((p) => p.id === patientId);
  if (!patient) {
    res.status(404).json({ error: "Patient record not found." });
    return;
  }

  // Snapshot before update for audit trail and rollback safety
  const previousSnapshot = {
    name: patient.name,
    dateOfBirth: patient.dateOfBirth,
    sex: patient.sex,
    emergencyName: patient.emergencyName,
    emergencyPhone: patient.emergencyPhone,
    notes: patient.notes,
  };

  // 4. Server-Side Validation
  const errors: Record<string, string> = {};
  const { name, dateOfBirth, sex, emergencyName, emergencyPhone, notes } = req.body || {};

  // Validate Name
  if (!name || typeof name !== "string" || !name.trim()) {
    errors.name = "Patient full legal name is required.";
  } else if (name.trim().length < 2) {
    errors.name = "Patient name must be at least 2 characters.";
  } else if (name.trim().length > 100) {
    errors.name = "Patient name cannot exceed 100 characters.";
  }

  // Validate Date of Birth
  let cleanDob: Date | null = null;
  if (!dateOfBirth) {
    errors.dateOfBirth = "Date of birth is required.";
  } else {
    cleanDob = new Date(dateOfBirth);
    if (isNaN(cleanDob.getTime())) {
      errors.dateOfBirth = "Please provide a valid calendar date.";
    } else {
      const now = new Date();
      if (cleanDob > now) {
        errors.dateOfBirth = "Date of birth cannot be in the future.";
      }
      const earliest = new Date("1900-01-01");
      if (cleanDob < earliest) {
        errors.dateOfBirth = "Please enter a valid realistic birth date.";
      }
    }
  }

  // Validate Emergency Contact Name
  if (!emergencyName || typeof emergencyName !== "string" || !emergencyName.trim()) {
    errors.emergencyName = "Emergency contact name is required.";
  } else if (emergencyName.trim().length < 2) {
    errors.emergencyName = "Emergency contact name must be at least 2 characters.";
  } else if (emergencyName.trim().length > 100) {
    errors.emergencyName = "Emergency contact name cannot exceed 100 characters.";
  }

  // Validate Emergency Contact Phone
  if (!emergencyPhone || typeof emergencyPhone !== "string" || !emergencyPhone.trim()) {
    errors.emergencyPhone = "Emergency contact phone number is required.";
  } else {
    const phoneCheck = validatePhone(emergencyPhone);
    if (!phoneCheck.valid) {
      errors.emergencyPhone = phoneCheck.error || "Please enter a valid phone number format.";
    }
  }

  // Validate Sex
  const validSexOptions = ["M", "F", "Other", "Undisclosed"];
  if (sex !== undefined && sex !== null && !validSexOptions.includes(String(sex))) {
    errors.sex = "Please select a valid option for biological sex.";
  }

  // Validate Notes Length
  if (notes !== undefined && typeof notes === "string" && notes.length > 500) {
    errors.notes = "Clinical notes cannot exceed 500 characters.";
  }

  // If validation errors exist: Reject with 400 Bad Request. Stored record remains UNCHANGED.
  if (Object.keys(errors).length > 0) {
    res.status(400).json({
      ok: false,
      error: "Validation failed. Please correct the highlighted errors.",
      errors,
    });
    return;
  }

  // 5. Persist Changes to Data Layer
  patient.name = name.trim();
  if (cleanDob) patient.dateOfBirth = cleanDob;
  if (sex) patient.sex = String(sex);
  patient.emergencyName = emergencyName.trim();
  patient.emergencyPhone = emergencyPhone.trim();
  if (notes !== undefined) patient.notes = typeof notes === "string" ? notes.trim() : "";

  // 6. Record 21 CFR Part 11 Audit Log
  db.auditLogs.push({
    id: `audit_${Date.now()}`,
    userId: session.id,
    role: session.role,
    patientId: patient.id,
    action: "CAREGIVER_PATIENT_DETAILS_UPDATED",
    previousValue: JSON.stringify(previousSnapshot),
    newValue: JSON.stringify({
      name: patient.name,
      dateOfBirth: patient.dateOfBirth,
      sex: patient.sex,
      emergencyName: patient.emergencyName,
      emergencyPhone: patient.emergencyPhone,
      notes: patient.notes,
    }),
    deviceId: null,
    result: "SUCCESS",
    timestamp: new Date(),
  });

  res.json({
    ok: true,
    message: "Patient details updated successfully.",
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      name: patient.name,
      dateOfBirth: patient.dateOfBirth instanceof Date ? patient.dateOfBirth.toISOString().split("T")[0] : String(patient.dateOfBirth),
      sex: patient.sex,
      emergencyName: patient.emergencyName,
      emergencyPhone: patient.emergencyPhone,
      notes: patient.notes,
    },
  });
}

/**
 * POST /api/caregiver/patients
 * Onboards and registers a new clinical patient in the hospital database,
 * automatically creating an active patient assignment for the requesting caregiver.
 */
export async function handleCreateCaregiverPatient(req: Request, res: Response): Promise<void> {
  const token = extractRequestToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthenticated: Sign-in required." });
    return;
  }

  const session = await verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: "Session expired or invalid." });
    return;
  }

  if (session.role !== "CAREGIVER" && session.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden: Caregiver or Administrator privileges required to onboard patients." });
    return;
  }

  // CSRF protection
  const csrf = checkCsrf(req);
  if (!csrf.safe) {
    res.status(403).json({ error: csrf.reason || "Forbidden: CSRF check failed." });
    return;
  }

  const { name, dateOfBirth, sex, emergencyName, emergencyPhone, notes, mrn } = req.body || {};

  // 1. Validate full legal name
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    res.status(400).json({ error: "Patient full legal name is required (minimum 2 characters)." });
    return;
  }

  // 2. Validate date of birth
  if (!dateOfBirth) {
    res.status(400).json({ error: "Patient date of birth is required." });
    return;
  }
  const parsedDob = new Date(dateOfBirth);
  if (isNaN(parsedDob.getTime())) {
    res.status(400).json({ error: "Invalid date format for date of birth." });
    return;
  }
  if (parsedDob > new Date()) {
    res.status(400).json({ error: "Date of birth cannot be in the future." });
    return;
  }

  // 3. Validate emergency contact name
  if (!emergencyName || typeof emergencyName !== "string" || emergencyName.trim().length < 2) {
    res.status(400).json({ error: "Primary emergency contact name is required." });
    return;
  }

  // 4. Validate emergency contact phone
  if (!emergencyPhone || typeof emergencyPhone !== "string" || !validatePhone(emergencyPhone)) {
    res.status(400).json({ error: "Emergency contact phone must contain between 8 and 15 digits." });
    return;
  }

  // 5. Generate unique ID & MRN
  const patientId = `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const patientMrn = mrn?.trim() || `MS-${String.fromCharCode(65 + (db.patients.length % 26))}-${1080 + db.patients.length + 1}`;

  const newPatient: DBPatient = {
    id: patientId,
    mrn: patientMrn,
    name: name.trim(),
    dateOfBirth: parsedDob,
    sex: sex?.trim() || "Undisclosed",
    emergencyName: emergencyName.trim(),
    emergencyPhone: emergencyPhone.trim(),
    notes: notes?.trim() || "Newly onboarded patient at clinical station.",
    createdAt: new Date(),
  };

  db.patients.push(newPatient);

  // 6. Automatically assign patient to current caregiver
  const caregiver = db.caregivers.find((c) => c.userId === session.id) || db.caregivers[0];
  const doctor = db.doctors[0];

  const assignment = {
    id: `pa_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    patientId: newPatient.id,
    doctorId: doctor?.id || null,
    caregiverId: caregiver?.id || null,
    active: true,
    createdAt: new Date(),
  };
  db.patientAssignments.push(assignment);

  // 7. Audit logging
  if (db.auditLogs) {
    db.auditLogs.push({
      id: `audit_${Date.now()}`,
      userId: session.id,
      role: session.role,
      patientId: newPatient.id,
      action: "PATIENT_ONBOARDED",
      previousValue: null,
      newValue: JSON.stringify({
        id: newPatient.id,
        mrn: newPatient.mrn,
        name: newPatient.name,
        assignedCaregiverId: caregiver?.id || null,
      }),
      deviceId: null,
      result: "SUCCESS",
      timestamp: new Date(),
    } as any);
  }

  res.status(201).json({
    ok: true,
    message: "Patient onboarded successfully.",
    patient: {
      id: newPatient.id,
      mrn: newPatient.mrn,
      name: newPatient.name,
      dateOfBirth: newPatient.dateOfBirth.toISOString().split("T")[0],
      sex: newPatient.sex,
      emergencyName: newPatient.emergencyName,
      emergencyPhone: newPatient.emergencyPhone,
      notes: newPatient.notes,
    },
  });
}

// Router configuration
caregiverPatientEditorRouter.get("/assigned-patients", handleGetAssignedPatients);
caregiverPatientEditorRouter.get("/patient-details/:id", handleGetCaregiverPatient);
caregiverPatientEditorRouter.put("/patient-details/:id", handleUpdateCaregiverPatient);
caregiverPatientEditorRouter.patch("/patient-details/:id", handleUpdateCaregiverPatient);
caregiverPatientEditorRouter.post("/patients", handleCreateCaregiverPatient);
caregiverPatientEditorRouter.post("/add-patient", handleCreateCaregiverPatient);
