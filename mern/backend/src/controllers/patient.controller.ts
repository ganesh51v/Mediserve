import { Request, Response } from 'express';
import { Patient } from '../models/Patient.js';
import { Device } from '../models/Device.js';
import { Medication } from '../models/Medication.js';
import { MedicationSchedule } from '../models/MedicationSchedule.js';
import { MedicationEvent } from '../models/MedicationEvent.js';
import { HealthRecord } from '../models/HealthRecord.js';
import { Alert } from '../models/Alert.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export async function getPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { q, doctorId, caretakerId } = req.query;
  const filter: any = {};

  if (q) {
    const regex = new RegExp(String(q), 'i');
    filter.$or = [
      { name: regex },
      { patient_code: regex },
      { medical_conditions: regex },
    ];
  }

  if (doctorId) filter.doctor_id = doctorId;
  if (caretakerId) filter.caretaker_id = caretakerId;

  const patients = await Patient.find(filter)
    .populate('doctor_id', 'name specialization')
    .populate('caretaker_id', 'name')
    .sort({ name: 1 });

  // Enrich with device info
  const enriched = await Promise.all(
    patients.map(async (p) => {
      const pObj: any = p.toJSON();
      if (p.doctor_id) {
        const d: any = p.doctor_id;
        pObj.doctor_name = d.name;
      }
      if (p.caretaker_id) {
        const c: any = p.caretaker_id;
        pObj.caretaker_name = c.name;
      }
      const device = await Device.findOne({ patient_id: p._id });
      if (device) {
        pObj.device_id = device.device_id;
        pObj.device_status = device.status;
      }
      return pObj;
    })
  );

  res.json({ success: true, patients: enriched });
}

export async function getPatientById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const patient = await Patient.findById(id)
    .populate('doctor_id', 'name email phone specialization')
    .populate('caretaker_id', 'name email phone');

  if (!patient) {
    res.status(404).json({ success: false, error: 'Patient record not found.' });
    return;
  }

  const pObj: any = patient.toJSON();
  if (patient.doctor_id) {
    const d: any = patient.doctor_id;
    pObj.doctor_name = d.name;
  }
  if (patient.caretaker_id) {
    const c: any = patient.caretaker_id;
    pObj.caretaker_name = c.name;
  }

  // Related data
  const [medications, schedules, events, healthRecords, device, alerts] = await Promise.all([
    Medication.find({ patient_id: id }).sort({ created_at: -1 }),
    MedicationSchedule.find({ patient_id: id }).populate('medication_id', 'name dosage medicine_type'),
    MedicationEvent.find({ patient_id: id })
      .populate('medication_id', 'name dosage medicine_type meal_relation')
      .sort({ scheduled_time: 1, created_at: -1 }),
    HealthRecord.find({ patient_id: id }).populate('recorded_by', 'name role').sort({ recorded_at: -1 }).limit(20),
    Device.findOne({ patient_id: id }),
    Alert.find({ patient_id: id }).sort({ created_at: -1 }).limit(10),
  ]);

  if (device) {
    pObj.device_id = device.device_id;
    pObj.device_status = device.status;
  }

  res.json({
    success: true,
    patient: pObj,
    medications: medications.map((m) => m.toJSON()),
    schedules: schedules.map((s) => {
      const sObj: any = s.toJSON();
      if (s.medication_id) {
        const med: any = s.medication_id;
        sObj.medication_name = med.name;
        sObj.dosage = med.dosage;
      }
      return sObj;
    }),
    events: events.map((e) => {
      const eObj: any = e.toJSON();
      if (e.medication_id) {
        const med: any = e.medication_id;
        eObj.medication_name = med.name;
        eObj.dosage = med.dosage;
        eObj.meal_relation = med.meal_relation;
      }
      return eObj;
    }),
    healthRecords: healthRecords.map((h) => {
      const hObj: any = h.toJSON();
      if (h.recorded_by) {
        const u: any = h.recorded_by;
        hObj.recorded_by_name = u.name;
      }
      return hObj;
    }),
    device: device ? device.toJSON() : null,
    alerts: alerts.map((a) => a.toJSON()),
  });
}

export async function createPatient(req: AuthenticatedRequest, res: Response): Promise<void> {
  const {
    name,
    date_of_birth,
    gender,
    phone,
    address,
    emergency_contact,
    emergency_phone,
    blood_group,
    allergies,
    medical_conditions,
    doctor_id,
    caretaker_id,
  } = req.body;

  if (!name || !date_of_birth || !emergency_contact || !emergency_phone) {
    res.status(400).json({ success: false, error: 'Name, date of birth, and emergency contacts are required.' });
    return;
  }

  // Generate patient code if not provided
  let patientCode = req.body.patient_code;
  if (!patientCode) {
    const total = await Patient.countDocuments();
    patientCode = `P-${1001 + total}`;
  }

  const patient = await Patient.create({
    patient_code: patientCode,
    name,
    date_of_birth,
    gender: gender || 'Unspecified',
    phone: phone || undefined,
    address: address || undefined,
    emergency_contact,
    emergency_phone,
    blood_group: blood_group || undefined,
    allergies: allergies || undefined,
    medical_conditions: medical_conditions || undefined,
    doctor_id: doctor_id || undefined,
    caretaker_id: caretaker_id || undefined,
    status: 'active',
  });

  res.status(201).json({ success: true, patient: patient.toJSON() });
}

export async function updatePatient(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const updates = req.body;

  const patient = await Patient.findByIdAndUpdate(id, updates, { new: true });
  if (!patient) {
    res.status(404).json({ success: false, error: 'Patient not found.' });
    return;
  }

  res.json({ success: true, patient: patient.toJSON() });
}

export async function deletePatient(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const patient = await Patient.findByIdAndDelete(id);
  if (!patient) {
    res.status(404).json({ success: false, error: 'Patient not found.' });
    return;
  }

  // Clean up cascade
  await Promise.all([
    Medication.deleteMany({ patient_id: id }),
    MedicationSchedule.deleteMany({ patient_id: id }),
    MedicationEvent.deleteMany({ patient_id: id }),
    HealthRecord.deleteMany({ patient_id: id }),
    Alert.deleteMany({ patient_id: id }),
    Device.updateMany({ patient_id: id }, { $unset: { patient_id: 1 } }),
  ]);

  res.json({ success: true, message: 'Patient record and associated schedules removed.' });
}

export async function getHealthRecords(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const records = await HealthRecord.find({ patient_id: id })
    .populate('recorded_by', 'name role')
    .sort({ recorded_at: -1 });

  res.json({
    success: true,
    records: records.map((r) => {
      const rObj: any = r.toJSON();
      if (r.recorded_by) {
        const u: any = r.recorded_by;
        rObj.recorded_by_name = u.name;
      }
      return rObj;
    }),
  });
}

export async function addHealthRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const {
    blood_pressure_sys,
    blood_pressure_dia,
    heart_rate,
    blood_glucose,
    temperature,
    oxygen_saturation,
    notes,
  } = req.body;

  const record = await HealthRecord.create({
    patient_id: id,
    recorded_by: req.user?.userId || undefined,
    blood_pressure_sys: blood_pressure_sys ? Number(blood_pressure_sys) : undefined,
    blood_pressure_dia: blood_pressure_dia ? Number(blood_pressure_dia) : undefined,
    heart_rate: heart_rate ? Number(heart_rate) : undefined,
    blood_glucose: blood_glucose ? Number(blood_glucose) : undefined,
    temperature: temperature ? Number(temperature) : undefined,
    oxygen_saturation: oxygen_saturation ? Number(oxygen_saturation) : undefined,
    notes: notes || undefined,
    recorded_at: new Date(),
  });

  res.status(201).json({ success: true, record: record.toJSON() });
}
