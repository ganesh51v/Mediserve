import { NextResponse } from "next/server";
import { db, DBPatient } from "@/lib/db";
import { extractRequestToken, verifySessionToken } from "../../../../../server/auth";

export async function GET(req: Request) {
  try {
    const token = extractRequestToken(req as any);
    if (!token) {
      return NextResponse.json({ error: "Unauthenticated: Sign-in required." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Session expired or invalid." }, { status: 401 });
    }

    let accessiblePatients: DBPatient[] = [];
    if (session.role === "ADMIN") {
      accessiblePatients = db.patients;
    } else if (session.role === "CAREGIVER") {
      const caregiver = db.caregivers.find((c) => c.userId === session.id);
      if (!caregiver) {
        return NextResponse.json({ ok: true, patients: [] });
      }
      const assignedIds = new Set(
        db.patientAssignments
          .filter((a) => a.active && a.caregiverId === caregiver.id)
          .map((a) => a.patientId)
      );
      accessiblePatients = db.patients.filter((p) => assignedIds.has(p.id));
    } else {
      return NextResponse.json({ error: "Forbidden: Caregiver or Admin role required." }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      patients: accessiblePatients.map((p) => ({
        id: p.id,
        mrn: p.mrn,
        name: p.name,
        dateOfBirth: p.dateOfBirth instanceof Date ? p.dateOfBirth.toISOString().split("T")[0] : String(p.dateOfBirth),
        sex: p.sex,
        emergencyName: p.emergencyName,
        emergencyPhone: p.emergencyPhone,
        notes: p.notes,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 }
    );
  }
}
