import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractRequestToken, verifySessionToken, validatePhone } from "../../../../../../server/auth";
import { isCaregiverAuthorizedForPatient } from "../../../../../../server/caregiverPatientEditor";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
    const token = extractRequestToken(req as any);
    if (!token) {
      return NextResponse.json({ error: "Unauthenticated: Sign-in required." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Session expired or invalid." }, { status: 401 });
    }

    const authorized = isCaregiverAuthorizedForPatient(session.id, session.role, patientId);
    if (!authorized) {
      return NextResponse.json(
        { error: "Access denied. You are not assigned to manage this patient." },
        { status: 403 }
      );
    }

    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) {
      return NextResponse.json({ error: "Patient record not found." }, { status: 404 });
    }

    return NextResponse.json({
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
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
    const token = extractRequestToken(req as any);
    if (!token) {
      return NextResponse.json({ error: "Unauthenticated: Sign-in required." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Session expired or invalid." }, { status: 401 });
    }

    const authorized = isCaregiverAuthorizedForPatient(session.id, session.role, patientId);
    if (!authorized) {
      return NextResponse.json(
        { error: "Access denied. You are not assigned to manage this patient." },
        { status: 403 }
      );
    }

    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) {
      return NextResponse.json({ error: "Patient record not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, dateOfBirth, sex, emergencyName, emergencyPhone, notes } = body;

    const errors: Record<string, string> = {};

    if (!name || typeof name !== "string" || !name.trim()) {
      errors.name = "Patient full legal name is required.";
    } else if (name.trim().length < 2) {
      errors.name = "Patient name must be at least 2 characters.";
    } else if (name.trim().length > 100) {
      errors.name = "Patient name cannot exceed 100 characters.";
    }

    let cleanDob: Date | null = null;
    if (!dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required.";
    } else {
      cleanDob = new Date(dateOfBirth);
      if (isNaN(cleanDob.getTime())) {
        errors.dateOfBirth = "Please provide a valid calendar date.";
      } else if (cleanDob > new Date()) {
        errors.dateOfBirth = "Date of birth cannot be in the future.";
      }
    }

    if (!emergencyName || typeof emergencyName !== "string" || !emergencyName.trim()) {
      errors.emergencyName = "Emergency contact name is required.";
    } else if (emergencyName.trim().length < 2) {
      errors.emergencyName = "Emergency contact name must be at least 2 characters.";
    }

    if (!emergencyPhone || typeof emergencyPhone !== "string" || !emergencyPhone.trim()) {
      errors.emergencyPhone = "Emergency contact phone number is required.";
    } else {
      const phoneCheck = validatePhone(emergencyPhone);
      if (!phoneCheck.valid) {
        errors.emergencyPhone = phoneCheck.error || "Please enter a valid phone number format.";
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { ok: false, error: "Validation failed.", errors },
        { status: 400 }
      );
    }

    // Persist
    patient.name = name.trim();
    if (cleanDob) patient.dateOfBirth = cleanDob;
    if (sex) patient.sex = String(sex);
    patient.emergencyName = emergencyName.trim();
    patient.emergencyPhone = emergencyPhone.trim();
    if (notes !== undefined) patient.notes = typeof notes === "string" ? notes.trim() : "";

    return NextResponse.json({
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
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(req, context);
}
