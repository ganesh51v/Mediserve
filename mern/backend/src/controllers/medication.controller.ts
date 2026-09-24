import { Response } from 'express';
import { Medication } from '../models/Medication.js';
import { MedicationSchedule } from '../models/MedicationSchedule.js';
import { MedicationEvent } from '../models/MedicationEvent.js';
import { restockMedication } from '../services/inventory.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export async function getMedications(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { q, patientId, lowStock } = req.query;
  const filter: any = {};

  if (patientId) filter.patient_id = patientId;

  if (q) {
    const regex = new RegExp(String(q), 'i');
    filter.$or = [
      { name: regex },
      { instructions: regex },
      { dosage: regex },
    ];
  }

  let medications = await Medication.find(filter)
    .populate('patient_id', 'name patient_code')
    .populate('doctor_id', 'name specialization')
    .sort({ created_at: -1 });

  if (lowStock === 'true') {
    medications = medications.filter((m) => m.current_quantity <= m.refill_threshold);
  }

  const enriched = medications.map((m) => {
    const mObj: any = m.toJSON();
    if (m.patient_id) {
      const p: any = m.patient_id;
      mObj.patient_name = p.name;
      mObj.patient_code = p.patient_code;
    }
    if (m.doctor_id) {
      const d: any = m.doctor_id;
      mObj.doctor_name = d.name;
    }
    return mObj;
  });

  res.json({ success: true, medications: enriched });
}

export async function getMedicationById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const med = await Medication.findById(id)
    .populate('patient_id', 'name patient_code')
    .populate('doctor_id', 'name specialization');

  if (!med) {
    res.status(404).json({ success: false, error: 'Medication not found.' });
    return;
  }

  const mObj: any = med.toJSON();
  if (med.patient_id) {
    const p: any = med.patient_id;
    mObj.patient_name = p.name;
    mObj.patient_code = p.patient_code;
  }
  if (med.doctor_id) {
    const d: any = med.doctor_id;
    mObj.doctor_name = d.name;
  }

  res.json({ success: true, medication: mObj });
}

export async function createMedication(req: AuthenticatedRequest, res: Response): Promise<void> {
  const {
    patient_id,
    name,
    medicine_type,
    dosage,
    current_quantity,
    refill_threshold,
    frequency,
    meal_relation,
    scheduled_time,
    start_date,
    end_date,
    instructions,
    special_precautions,
  } = req.body;

  if (!patient_id || !name || !dosage || !frequency || !meal_relation || !scheduled_time || !start_date) {
    res.status(400).json({ success: false, error: 'All core prescription parameters are required.' });
    return;
  }

  const med = await Medication.create({
    patient_id,
    doctor_id: req.user?.userId || undefined,
    name,
    medicine_type: medicine_type || 'Tablet',
    dosage,
    current_quantity: Number(current_quantity) || 30,
    initial_quantity: Number(current_quantity) || 30,
    refill_threshold: Number(refill_threshold) || 5,
    frequency,
    meal_relation,
    scheduled_time,
    start_date,
    end_date: end_date || undefined,
    instructions: instructions || undefined,
    special_precautions: special_precautions || undefined,
    status: 'active',
  });

  // Create daily schedule record
  const schedule = await MedicationSchedule.create({
    medication_id: med._id,
    patient_id,
    scheduled_time,
    meal_relation,
    days_of_week: 'Daily',
    active: true,
  });

  // Create today's initial pending event
  await MedicationEvent.create({
    patient_id,
    medication_id: med._id,
    schedule_id: schedule._id,
    scheduled_time,
    status: 'pending',
  });

  res.status(201).json({ success: true, medication: med.toJSON() });
}

export async function updateMedication(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const updates = req.body;

  const med = await Medication.findByIdAndUpdate(id, updates, { new: true });
  if (!med) {
    res.status(404).json({ success: false, error: 'Medication not found.' });
    return;
  }

  res.json({ success: true, medication: med.toJSON() });
}

export async function deleteMedication(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const med = await Medication.findByIdAndDelete(id);

  if (!med) {
    res.status(404).json({ success: false, error: 'Medication not found.' });
    return;
  }

  await MedicationSchedule.deleteMany({ medication_id: id });
  await MedicationEvent.deleteMany({ medication_id: id });

  res.json({ success: true, message: 'Prescription removed from system.' });
}

export async function refillMedication(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { quantity } = req.body;

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    res.status(400).json({ success: false, error: 'Refill quantity must be a positive number.' });
    return;
  }

  const updated = await restockMedication(id, qty);
  if (!updated) {
    res.status(404).json({ success: false, error: 'Medication not found.' });
    return;
  }

  res.json({ success: true, medication: updated.toJSON() });
}

export async function getSchedules(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { patientId } = req.query;
  const filter: any = {};
  if (patientId) filter.patient_id = patientId;

  const schedules = await MedicationSchedule.find(filter)
    .populate('medication_id', 'name dosage medicine_type meal_relation')
    .sort({ scheduled_time: 1 });

  const enriched = schedules.map((s) => {
    const sObj: any = s.toJSON();
    if (s.medication_id) {
      const med: any = s.medication_id;
      sObj.medication_name = med.name;
      sObj.dosage = med.dosage;
      sObj.medicine_type = med.medicine_type;
    }
    return sObj;
  });

  res.json({ success: true, schedules: enriched });
}

export async function getEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { patientId, status } = req.query;
  const filter: any = {};
  if (patientId) filter.patient_id = patientId;
  if (status) filter.status = status;

  const events = await MedicationEvent.find(filter)
    .populate('medication_id', 'name dosage medicine_type meal_relation')
    .populate('patient_id', 'name patient_code')
    .sort({ scheduled_time: 1, created_at: -1 });

  const enriched = events.map((e) => {
    const eObj: any = e.toJSON();
    if (e.medication_id) {
      const med: any = e.medication_id;
      eObj.medication_name = med.name;
      eObj.dosage = med.dosage;
      eObj.meal_relation = med.meal_relation;
    }
    if (e.patient_id) {
      const p: any = e.patient_id;
      eObj.patient_name = p.name;
      eObj.patient_code = p.patient_code;
    }
    return eObj;
  });

  res.json({ success: true, events: enriched });
}
