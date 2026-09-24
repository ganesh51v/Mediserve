import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Medication, MedicationEvent } from '../models/types.js';
import { emitEvent } from '../services/socket.service.js';

export function getMedications(req: AuthenticatedRequest, res: Response): void {
  const db = getDatabase();
  const { patientId, status, q } = req.query;

  let query = `
    SELECT 
      m.*,
      p.name as patient_name,
      p.patient_code,
      u.name as doctor_name
    FROM medications m
    JOIN patients p ON m.patient_id = p.id
    LEFT JOIN users u ON m.doctor_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (patientId) {
    query += ' AND m.patient_id = ?';
    params.push(patientId);
  }

  if (status) {
    query += ' AND m.status = ?';
    params.push(status);
  }

  if (q) {
    query += ' AND (m.name LIKE ? OR p.name LIKE ? OR m.instructions LIKE ?)';
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY m.created_at DESC';

  const medications = db.prepare(query).all(...params);
  res.json({ success: true, count: medications.length, medications });
}

export function createMedication(req: AuthenticatedRequest, res: Response): void {
  const {
    patient_id,
    name,
    medicine_type = 'Tablet',
    dosage,
    current_quantity = 30,
    initial_quantity = 30,
    refill_threshold = 5,
    frequency,
    meal_relation,
    scheduled_time,
    start_date,
    end_date,
    instructions,
    special_precautions,
    storage_info,
    expiry_date,
  } = req.body;

  if (!patient_id || !name || !dosage || !frequency || !meal_relation || !scheduled_time || !start_date) {
    res.status(400).json({
      success: false,
      error: 'Patient ID, medicine name, dosage, frequency, meal relation, scheduled time, and start date are required.',
    });
    return;
  }

  const db = getDatabase();
  const medId = uuidv4();
  const schedId = uuidv4();
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];
  const doctorId = req.user?.role === 'doctor' ? req.user.userId : req.body.doctor_id || null;

  // Insert Medication
  db.prepare(`
    INSERT INTO medications (
      id, patient_id, doctor_id, name, medicine_type, dosage,
      current_quantity, initial_quantity, refill_threshold, frequency,
      meal_relation, scheduled_time, start_date, end_date, instructions,
      special_precautions, storage_info, expiry_date, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(
    medId,
    patient_id,
    doctorId,
    name,
    medicine_type,
    dosage,
    current_quantity,
    initial_quantity,
    refill_threshold,
    frequency,
    meal_relation,
    scheduled_time,
    start_date,
    end_date || null,
    instructions || null,
    special_precautions || null,
    storage_info || 'Store in a cool, dry place',
    expiry_date || null,
    now,
    now
  );

  // Insert Default Daily Schedule
  db.prepare(`
    INSERT INTO medication_schedules (
      id, medication_id, patient_id, scheduled_time, meal_relation, days_of_week, active, created_at
    )
    VALUES (?, ?, ?, ?, ?, 'Mon,Tue,Wed,Thu,Fri,Sat,Sun', 1, ?)
  `).run(schedId, medId, patient_id, scheduled_time, meal_relation, now);

  // Find linked device
  const device = db.prepare('SELECT id FROM devices WHERE patient_id = ?').get(patient_id) as { id: string } | undefined;

  // Generate today's event so it immediately shows up in Caretaker view
  const eventId = uuidv4();
  db.prepare(`
    INSERT INTO medication_events (
      id, patient_id, medication_id, schedule_id, device_id, scheduled_time, status, meal_context, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(
    eventId,
    patient_id,
    medId,
    schedId,
    device?.id || null,
    `${todayStr}T${scheduled_time}:00Z`,
    meal_relation,
    now
  );

  // Log to audit log
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (?, ?, 'PRESCRIPTION_CREATED', 'medications', ?, ?, ?, ?)
  `).run(
    uuidv4(),
    req.user?.userId || null,
    medId,
    `Prescribed ${name} (${dosage}, ${frequency}, ${meal_relation}) to patient ${patient_id}`,
    req.ip || '127.0.0.1',
    now
  );

  const created = db.prepare(`
    SELECT m.*, p.name as patient_name, u.name as doctor_name
    FROM medications m
    JOIN patients p ON m.patient_id = p.id
    LEFT JOIN users u ON m.doctor_id = u.id
    WHERE m.id = ?
  `).get(medId);

  emitEvent('medication:created', created);

  res.status(201).json({ success: true, medication: created });
}

export function updateMedication(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;
  const db = getDatabase();

  const existing = db.prepare('SELECT * FROM medications WHERE id = ?').get(id) as Medication | undefined;
  if (!existing) {
    res.status(404).json({ success: false, error: 'Medication prescription not found.' });
    return;
  }

  const {
    dosage,
    frequency,
    meal_relation,
    scheduled_time,
    instructions,
    special_precautions,
    refill_threshold,
    status,
  } = req.body;

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE medications
    SET 
      dosage = COALESCE(?, dosage),
      frequency = COALESCE(?, frequency),
      meal_relation = COALESCE(?, meal_relation),
      scheduled_time = COALESCE(?, scheduled_time),
      instructions = COALESCE(?, instructions),
      special_precautions = COALESCE(?, special_precautions),
      refill_threshold = COALESCE(?, refill_threshold),
      status = COALESCE(?, status),
      updated_at = ?
    WHERE id = ?
  `).run(
    dosage,
    frequency,
    meal_relation,
    scheduled_time,
    instructions,
    special_precautions,
    refill_threshold,
    status,
    now,
    id
  );

  const updated = db.prepare('SELECT * FROM medications WHERE id = ?').get(id);
  res.json({ success: true, medication: updated });
}

export function refillMedication(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;
  const { quantityToAdd } = req.body;

  if (!quantityToAdd || quantityToAdd <= 0) {
    res.status(400).json({ success: false, error: 'Quantity to add must be greater than zero.' });
    return;
  }

  const db = getDatabase();
  const med = db.prepare('SELECT * FROM medications WHERE id = ?').get(id) as Medication | undefined;
  if (!med) {
    res.status(404).json({ success: false, error: 'Medication not found.' });
    return;
  }

  const newQty = med.current_quantity + Number(quantityToAdd);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE medications
    SET current_quantity = ?, updated_at = ?
    WHERE id = ?
  `).run(newQty, now, id);

  // If above threshold, resolve any active refill alerts for this patient
  if (newQty > med.refill_threshold) {
    db.prepare(`
      UPDATE alerts
      SET status = 'resolved', resolved_at = ?
      WHERE patient_id = ? AND type = 'refill_required' AND status != 'resolved'
    `).run(now, med.patient_id);
  }

  const updated = db.prepare('SELECT * FROM medications WHERE id = ?').get(id);
  res.json({ success: true, medication: updated });
}

export function recordDoseEvent(req: AuthenticatedRequest, res: Response): void {
  const { eventId, status, notes } = req.body;

  if (!eventId || !['taken', 'missed', 'delayed', 'skipped'].includes(status)) {
    res.status(400).json({ success: false, error: 'Valid eventId and status (taken, missed, delayed, skipped) are required.' });
    return;
  }

  const db = getDatabase();
  const event = db.prepare('SELECT * FROM medication_events WHERE id = ?').get(eventId) as MedicationEvent | undefined;
  if (!event) {
    res.status(404).json({ success: false, error: 'Medication event record not found.' });
    return;
  }

  const now = new Date().toISOString();
  const takenAt = status === 'taken' ? now : null;

  db.prepare(`
    UPDATE medication_events
    SET status = ?, taken_at = COALESCE(?, taken_at), notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(status, takenAt, notes, eventId);

  const updated = db.prepare(`
    SELECT e.*, m.name as medication_name, m.dosage, p.name as patient_name
    FROM medication_events e
    JOIN medications m ON e.medication_id = m.id
    JOIN patients p ON e.patient_id = p.id
    WHERE e.id = ?
  `).get(eventId) as MedicationEvent;

  emitEvent('dose:status_update', {
    patientId: updated.patient_id,
    status,
    event: updated,
  });

  res.json({ success: true, event: updated });
}
