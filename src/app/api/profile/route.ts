import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  extractRequestToken,
  verifySessionToken,
  signSessionToken,
  validateEmail,
  validatePhone,
  SessionPayload,
} from "../../../../server/auth";
import { buildProfileResponse } from "../../../../server/profile";

export async function GET(req: Request) {
  try {
    const token = extractRequestToken(req as any);
    if (!token) {
      return NextResponse.json({ error: "Unauthenticated: Sign-in required." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Invalid or expired session token." }, { status: 401 });
    }

    const user = db.users.find((u) => u.id === session.id);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const doctor = db.doctors.find((d) => d.userId === user.id);
    const caregiver = db.caregivers.find((c) => c.userId === user.id);

    const profile = buildProfileResponse(user, doctor, caregiver);
    return NextResponse.json({ ok: true, profile });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const token = extractRequestToken(req as any);
    if (!token) {
      return NextResponse.json({ error: "Unauthenticated: Sign-in required." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Invalid or expired session token." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    // Cross-user edit check: strictly reject editing another user's profile
    if ((body.id && body.id !== session.id) || (body.userId && body.userId !== session.id)) {
      return NextResponse.json(
        { error: "Access denied: You are not authorized to modify another user's profile." },
        { status: 403 }
      );
    }

    const user = db.users.find((u) => u.id === session.id);
    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const errors: Record<string, string> = {};
    const { name, email, phone, specialty, hospitalAffiliation, yearsOfPractice, certifications, yearsOfExperience, typesOfCare, availability } = body;

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        errors.name = "Full legal name is required.";
      } else if (name.trim().length < 2) {
        errors.name = "Name must be at least 2 characters.";
      } else if (name.trim().length > 100) {
        errors.name = "Name cannot exceed 100 characters.";
      }
    }

    let cleanEmail = user.email;
    if (email !== undefined) {
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) {
        errors.email = emailCheck.error || "Please provide a valid email address.";
      } else {
        cleanEmail = emailCheck.email!;
        const duplicate = db.users.find(
          (u) => u.email.toLowerCase() === cleanEmail.toLowerCase() && u.id !== user.id
        );
        if (duplicate) {
          errors.email = "This email address is already in use by another account.";
        }
      }
    }

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

    if (Object.keys(errors).length > 0) {
      const status = errors.email === "This email address is already in use by another account." ? 409 : 400;
      return NextResponse.json({ ok: false, error: "Validation failed.", errors }, { status });
    }

    // Persist to in-memory DB
    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = cleanEmail;
    user.phone = cleanPhone;

    let doctor = db.doctors.find((d) => d.userId === user.id);
    if (user.role === "DOCTOR") {
      if (!doctor) {
        doctor = { id: `doc_${Date.now()}`, userId: user.id, specialty: specialty || "General Practice" };
        db.doctors.push(doctor);
      }
      if (specialty !== undefined) doctor.specialty = String(specialty).trim();
      if (hospitalAffiliation !== undefined) doctor.hospitalAffiliation = String(hospitalAffiliation).trim();
      if (yearsOfPractice !== undefined) doctor.yearsOfPractice = Number(yearsOfPractice) || 0;
    }

    let caregiver = db.caregivers.find((c) => c.userId === user.id);
    if (user.role === "CAREGIVER") {
      if (!caregiver) {
        caregiver = { id: `cg_${Date.now()}`, userId: user.id, phone: cleanPhone || "+1-555-0199" };
        db.caregivers.push(caregiver);
      }
      if (cleanPhone) caregiver.phone = cleanPhone;
      if (certifications !== undefined) caregiver.certifications = String(certifications).trim();
      if (yearsOfExperience !== undefined) caregiver.yearsOfExperience = Number(yearsOfExperience) || 0;
      if (typesOfCare !== undefined) caregiver.typesOfCare = String(typesOfCare).trim();
      if (availability !== undefined) caregiver.availability = String(availability).trim();
    }

    const updatedSession: SessionPayload = {
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

    const token = await signSessionToken(updatedSession);
    const profile = buildProfileResponse(user, doctor, caregiver);

    return NextResponse.json({
      ok: true,
      message: "Profile updated successfully.",
      user: updatedSession,
      profile,
      token,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  return PUT(req);
}

