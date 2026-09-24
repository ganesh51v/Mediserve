import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Patient } from '../models/types.js';
import { calculateAdherence } from '../services/adherence.service.js';

export function getPatients(req: AuthenticatedRequest, res: Response): void {
  const db = getDatabase();
  const { q, doctorId, caretakerId, status } = req.query;

  let query = `
    SELECT 
      p.*,
      d.name as doctor_name,
      c.name as caretaker_name,
      dev.device_id as assigned_device_id,
      dev.status as device_status,
      dev.battery_level as device_battery
    FROM patients p
    LEFT JOIN users d ON p.doctor_id = d.id
    LEFT JOIN users c ON p.caretaker_id = c.id
    LEFT JOIN devices dev ON p.id = dev.patient_id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Role scoping: if doctor, show their patients (unless admin)
  if (req.user?.role === 'doctor') {
    query += ' AND (p.doctor_id = ? OR p.doctor_id IS NULL)';
    params.push(req.user.userId);
  } else if (req.user?.role === 'caretaker') {
    query += ' AND (p.caretaker_id = ? OR p.caretaker_id IS NULL)';
    params.push(req.user.userId);
  }

  if (doctorId) {
    query += ' AND p.doctor_id = ?';
    params.push(doctorId);
  }

  if (caretakerId) {
    query += ' AND p.caretaker_id = ?';
    params.push(caretakerId);
  }

  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }

  if (q) {
    query += ' AND (p.name LIKE ? OR p.patient_code LIKE ? OR p.medical_conditions LIKE ?)';
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY p.name ASC';

  const patients = db.prepare(query).all(...params);
  res.json({ success: true, count: patients.length, patients });
}

export function getPatientById(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;
  const db = getDatabase();

  const patient = db.prepare(`
    SELECT 
      p.*,
      d.name as doctor_name,
      d.email as doctor_email,
      d.phone as doctor_phone,
      c.name as caretaker_name,
      c.email as caretaker_email,
      c.phone as caretaker_phone
    FROM patients p
    LEFT JOIN users d ON p.doctor_id = d.id
    LEFT JOIN users c ON p.caretaker_id = c.id
    WHERE p.id = ? OR p.patient_code = ?
  `).get(id, id) as Patient | undefined;

  if (!patient) {
    res.status(404).json({ success: false, error: 'Patient record not found.' });
    return;
  }

  // 1. Medications
  const medications = db.prepare(`
    SELECT m.*, u.name as doctor_name
    FROM medications m
    LEFT JOIN users u ON m.doctor_id = u.id
    WHERE m.patient_id = ?
    ORDER BY m.created_at DESC
  `).all(patient.id);

  // 2. Schedules
  const schedules = db.prepare(`
    SELECT s.*, m.name as medication_name, m.dosage, m.medicine_type
    FROM medication_schedules s
    JOIN medications m ON s.medication_id = m.id
    WHERE s.patient_id = ? AND s.active = 1
    ORDER BY s.scheduled_time ASC
  `).all(patient.id);

  // 3. Today's Events
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = db.prepare(`
    SELECT e.*, m.name as medication_name, m.dosage, m.meal_relation, m.medicine_type
    FROM medication_events e
    JOIN medications m ON e.medication_id = m.id
    WHERE e.patient_id = ? AND e.scheduled_time LIKE ?
    ORDER BY e.scheduled_time ASC
  `).all(patient.id, `${todayStr}%`);

  // 4. Connected Device
  const device = db.prepare('SELECT * FROM devices WHERE patient_id = ?').get(patient.id);

  // 5. Health Records
  const healthRecords = db.prepare(`
    SELECT h.*, u.name as recorded_by_name
    FROM health_records h
    LEFT JOIN users u ON h.recorded_by = u.id
    WHERE h.patient_id = ?
    ORDER BY h.recorded_at DESC
    LIMIT 30
  `).all(patient.id);

  // 6. Alerts
  const alerts = db.prepare(`
    SELECT a.*, u.name as acknowledged_by_name
    FROM alerts a
    LEFT JOIN users u ON a.acknowledged_by = u.id
    WHERE a.patient_id = ?
    ORDER BY a.created_at DESC
    LIMIT 20
  `).all(patient.id);

  // 7. Adherence Analytics
  const adherence = calculateAdherence(patient.id);

  res.json({
    success: true,
    patient,
    medications,
    schedules,
    todayEvents,
    device,
    healthRecords,
    alerts,
    adherence,
  });
}

export function createPatient(req: AuthenticatedRequest, res: Response): void {
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

  if (!name || !date_of_birth || !gender || !emergency_contact || !emergency_phone) {
    res.status(400).json({
      success: false,
      error: 'Name, date of birth, gender, emergency contact, and emergency phone are required.',
    });
    return;
  }

  const db = getDatabase();
  const id = uuidv4();
  const count = (db.prepare('SELECT COUNT(*) as c FROM patients').get() as { c: number }).c;
  const patient_code = `P-${1001 + count}`;
  const now = new Date().toISOString();

  const assignedDoctorId = doctor_id || (req.user?.role === 'doctor' ? req.user.userId : null);

  db.prepare(`
    INSERT INTO patients (
      id, patient_code, name, date_of_birth, gender, phone, address,
      emergency_contact, emergency_phone, blood_group, allergies,
      medical_conditions, doctor_id, caretaker_id, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(
    id,
    patient_code,
    name,
    date_of_birth,
    gender,
    phone || null,
    address || null,
    emergency_contact,
    emergency_phone,
    blood_group || null,
    allergies || null,
    medical_conditions || null,
    assignedDoctorId,
    caretaker_id || null,
    now,
    now
  );

  // Log to audit
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (?, ?, 'PATIENT_REGISTERED', 'patients', ?, ?, ?, ?)
  `).run(
    uuidv4(),
    req.user?.userId || null,
    id,
    `Registered new patient ${name} (${patient_code})`,
    req.ip || '127.0.0.1',
    now
  );

  const created = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  res.status(201).json({ success: true, patient: created });
}

export function updatePatient(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);

  if (!existing) {
    res.status(404).json({ success: false, error: 'Patient not found.' });
    return;
  }

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
    status,
  } = req.body;

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE patients
    SET 
      name = COALESCE(?, name),
      date_of_birth = COALESCE(?, date_of_birth),
      gender = COALESCE(?, gender),
      phone = COALESCE(?, phone),
      address = COALESCE(?, address),
      emergency_contact = COALESCE(?, emergency_contact),
      emergency_phone = COALESCE(?, emergency_phone),
      blood_group = COALESCE(?, blood_group),
      allergies = COALESCE(?, allergies),
      medical_conditions = COALESCE(?, medical_conditions),
      doctor_id = COALESCE(?, doctor_id),
      caretaker_id = COALESCE(?, caretaker_id),
      status = COALESCE(?, status),
      updated_at = ?
    WHERE id = ?
  `).run(
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
    status,
    now,
    id
  );

  const updated = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  res.json({ success: true, patient: updated });
}

export function addHealthRecord(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params; // patientId
  const {
    blood_pressure_sys,
    blood_pressure_dia,
    heart_rate,
    blood_glucose,
    temperature,
    oxygen_saturation,
    notes,
  } = req.body;

  const db = getDatabase();
  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(id);
  if (!patient) {
    res.status(404).json({ success: false, error: 'Patient not found.' });
    return;
  }

  const recordId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO health_records (
      id, patient_id, recorded_by, blood_pressure_sys, blood_pressure_dia,
      heart_rate, blood_glucose, temperature, oxygen_saturation, notes, recorded_at, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    recordId,
    id,
    req.user?.userId || null,
    blood_pressure_sys || null,
    blood_pressure_dia || null,
    heart_rate || null,
    blood_glucose || null,
    temperature || null,
    oxygen_saturation || null,
    notes || null,
    now,
    now
  );

  const created = db.prepare(`
    SELECT h.*, u.name as recorded_by_name
    FROM health_records h
    LEFT JOIN users u ON h.recorded_by = u.id
    WHERE h.id = ?
  `).get(recordId);

  res.status(201).json({ success: true, healthRecord: created });
}
