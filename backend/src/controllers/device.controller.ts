import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Device, DeviceCompartment } from '../models/types.js';
import { createAlert } from '../services/alert.service.js';
import { processMealDetected, processDoseTaken, processDoseMissed, MealType } from '../services/mealRule.service.js';
import { emitEvent } from '../services/socket.service.js';

export function getAllDevices(_req: AuthenticatedRequest, res: Response): void {
  const db = getDatabase();

  const devices = db.prepare(`
    SELECT 
      d.*,
      p.name as patient_name,
      p.patient_code,
      p.id as patient_id
    FROM devices d
    LEFT JOIN patients p ON d.patient_id = p.id
    ORDER BY d.device_id ASC
  `).all();

  res.json({ success: true, count: devices.length, devices });
}

export function getDeviceById(req: Request, res: Response): void {
  const { id } = req.params;
  const db = getDatabase();

  const device = db.prepare(`
    SELECT 
      d.*,
      p.name as patient_name,
      p.patient_code,
      p.emergency_contact,
      p.emergency_phone
    FROM devices d
    LEFT JOIN patients p ON d.patient_id = p.id
    WHERE d.id = ? OR d.device_id = ?
  `).get(id, id) as Device | undefined;

  if (!device) {
    res.status(404).json({ success: false, error: 'Device not found.' });
    return;
  }

  res.json({ success: true, device });
}

export function registerDevice(req: Request, res: Response): void {
  const { device_id, patient_id, firmware_version = 'v2.4.1' } = req.body;

  if (!device_id) {
    res.status(400).json({ success: false, error: 'device_id is required.' });
    return;
  }

  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM devices WHERE device_id = ?').get(device_id);
  if (existing) {
    res.status(409).json({ success: false, error: 'Device already registered.' });
    return;
  }

  const id = uuidv4();
  const device_token = `token_${device_id.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();

  const defaultCompartments: DeviceCompartment[] = [
    { compartment: 1, capacity: 30, pills_remaining: 30 },
    { compartment: 2, capacity: 30, pills_remaining: 30 },
    { compartment: 3, capacity: 30, pills_remaining: 30 },
    { compartment: 4, capacity: 30, pills_remaining: 30 },
    { compartment: 5, capacity: 30, pills_remaining: 30 },
    { compartment: 6, capacity: 30, pills_remaining: 30 },
  ];

  db.prepare(`
    INSERT INTO devices (
      id, device_id, patient_id, status, battery_level, signal_strength,
      firmware_version, last_seen, compartments_json, dispensing_status,
      device_token, created_at, updated_at
    )
    VALUES (?, ?, ?, 'online', 100, 'strong', ?, ?, ?, 'idle', ?, ?, ?)
  `).run(
    id,
    device_id,
    patient_id || null,
    firmware_version,
    now,
    JSON.stringify(defaultCompartments),
    device_token,
    now,
    now
  );

  const created = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
  res.status(201).json({ success: true, device: created, device_token });
}

export function handleHeartbeat(req: Request, res: Response): void {
  const { device_id, battery_level, signal_strength, firmware_version } = req.body;

  if (!device_id) {
    res.status(400).json({ success: false, error: 'device_id is required.' });
    return;
  }

  const db = getDatabase();
  const now = new Date().toISOString();

  let status = 'online';
  if (battery_level !== undefined && battery_level <= 20) {
    status = 'warning';
  }

  db.prepare(`
    UPDATE devices
    SET 
      last_seen = ?,
      battery_level = COALESCE(?, battery_level),
      signal_strength = COALESCE(?, signal_strength),
      firmware_version = COALESCE(?, firmware_version),
      status = ?,
      updated_at = ?
    WHERE device_id = ?
  `).run(now, battery_level, signal_strength, firmware_version, status, now, device_id);

  const updated = db.prepare('SELECT * FROM devices WHERE device_id = ?').get(device_id);

  emitEvent('device:status_update', updated);

  res.json({ success: true, timestamp: now, device: updated });
}

export function handleDeviceEvents(req: Request, res: Response): void {
  const { event_type, device_id, patient_id, medication_id, event_id, meal_type, payload } = req.body;

  if (!event_type) {
    res.status(400).json({ success: false, error: 'event_type is required.' });
    return;
  }

  const db = getDatabase();
  const now = new Date().toISOString();

  // Find linked device and patient
  let targetDeviceId = device_id;
  let targetPatientId = patient_id;

  if (device_id && !patient_id) {
    const dev = db.prepare('SELECT id, patient_id FROM devices WHERE device_id = ? OR id = ?').get(device_id, device_id) as any;
    if (dev) {
      targetDeviceId = dev.id;
      targetPatientId = dev.patient_id;
    }
  }

  switch (event_type) {
    case 'MEAL_DETECTED': {
      if (!targetPatientId) {
        res.status(400).json({ success: false, error: 'Patient ID is required for meal detection event.' });
        return;
      }
      const meal = (meal_type || 'breakfast') as MealType;
      const result = processMealDetected({
        patientId: targetPatientId,
        mealType: meal,
        deviceId: targetDeviceId,
        detectedAt: now,
      });
      res.json({ success: true, message: `Processed ${meal} detection`, result });
      return;
    }

    case 'MEDICATION_DISPENSED': {
      if (targetDeviceId) {
        db.prepare(`
          UPDATE devices
          SET dispensing_status = 'idle', last_dispense_time = ?, last_seen = ?
          WHERE id = ? OR device_id = ?
        `).run(now, now, targetDeviceId, targetDeviceId);
      }
      if (event_id) {
        db.prepare(`
          UPDATE medication_events
          SET status = 'dispensed', dispensed_at = ?
          WHERE id = ?
        `).run(now, event_id);
      }
      emitEvent('dose:status_update', { eventId: event_id, status: 'dispensed' });
      res.json({ success: true, message: 'Recorded medication dispensed confirmation.' });
      return;
    }

    case 'DOSE_TAKEN': {
      if (!targetPatientId) {
        res.status(400).json({ success: false, error: 'patient_id is required.' });
        return;
      }
      const event = processDoseTaken({
        patientId: targetPatientId,
        medicationId: medication_id,
        eventId: event_id,
        takenAt: now,
      });
      res.json({ success: true, message: 'Recorded dose taken', event });
      return;
    }

    case 'DOSE_MISSED': {
      if (!targetPatientId) {
        res.status(400).json({ success: false, error: 'patient_id is required.' });
        return;
      }
      const event = processDoseMissed({
        patientId: targetPatientId,
        medicationId: medication_id,
        eventId: event_id,
        reason: payload?.reason || 'Hardware sensor: dose not removed from dispenser slot',
      });
      res.json({ success: true, message: 'Recorded dose missed', event });
      return;
    }

    case 'DEVICE_OFFLINE': {
      if (targetDeviceId) {
        db.prepare(`
          UPDATE devices
          SET status = 'offline', error_message = 'Connection lost', updated_at = ?
          WHERE id = ? OR device_id = ?
        `).run(now, targetDeviceId, targetDeviceId);

        createAlert({
          patientId: targetPatientId,
          deviceId: targetDeviceId,
          type: 'device_offline',
          severity: 'critical',
          title: 'Smart Dispenser Offline',
          message: `MediServe hardware ${device_id} disconnected unexpectedly. Patient medication tracking suspended.`,
        });

        const dev = db.prepare('SELECT * FROM devices WHERE id = ? OR device_id = ?').get(targetDeviceId, targetDeviceId);
        emitEvent('device:status_update', dev);
      }
      res.json({ success: true, message: 'Device marked offline' });
      return;
    }

    case 'DEVICE_ONLINE': {
      if (targetDeviceId) {
        db.prepare(`
          UPDATE devices
          SET status = 'online', error_message = NULL, last_seen = ?, updated_at = ?
          WHERE id = ? OR device_id = ?
        `).run(now, now, targetDeviceId, targetDeviceId);

        const dev = db.prepare('SELECT * FROM devices WHERE id = ? OR device_id = ?').get(targetDeviceId, targetDeviceId);
        emitEvent('device:status_update', dev);
      }
      res.json({ success: true, message: 'Device marked online' });
      return;
    }

    case 'LOW_MEDICINE':
    case 'MEDICINE_REFILL_REQUIRED': {
      createAlert({
        patientId: targetPatientId,
        deviceId: targetDeviceId,
        type: 'refill_required',
        severity: 'high',
        title: 'Medication Refill Alert',
        message: payload?.message || `Dispenser compartment sensor reports low pill count. Refill required.`,
      });
      res.json({ success: true, message: 'Refill alert registered' });
      return;
    }

    case 'DISPENSER_ERROR':
    case 'MEDICATION_NOT_DISPENSED': {
      if (targetDeviceId) {
        db.prepare(`
          UPDATE devices
          SET dispensing_status = 'error', error_message = ?, updated_at = ?
          WHERE id = ? OR device_id = ?
        `).run(payload?.error || 'Dispenser mechanism jammed', now, targetDeviceId, targetDeviceId);
      }

      createAlert({
        patientId: targetPatientId,
        deviceId: targetDeviceId,
        type: 'dispenser_error',
        severity: 'critical',
        title: 'Dispenser Mechanism Failure',
        message: payload?.error || `Hardware error: Medication could not be dispensed. Caretaker intervention required.`,
      });

      res.json({ success: true, message: 'Dispenser error reported' });
      return;
    }

    default:
      res.status(400).json({ success: false, error: `Unknown hardware event type: ${event_type}` });
  }
}

export function triggerDispense(req: Request, res: Response): void {
  const { device_id, medication_id, compartment } = req.body;

  if (!device_id) {
    res.status(400).json({ success: false, error: 'device_id is required.' });
    return;
  }

  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE devices
    SET dispensing_status = 'dispensing', last_dispense_time = ?, last_seen = ?
    WHERE device_id = ? OR id = ?
  `).run(now, now, device_id, device_id);

  const device = db.prepare('SELECT * FROM devices WHERE device_id = ? OR id = ?').get(device_id, device_id);

  emitEvent('device:status_update', device);
  emitEvent('hardware:dispense_command', {
    deviceId: device_id,
    medicationId: medication_id,
    compartment: compartment || 1,
    timestamp: now,
  });

  res.json({
    success: true,
    message: `Dispense signal sent to hardware ${device_id} (Compartment ${compartment || 1}).`,
    device,
  });
}

export function getDeviceConfig(req: Request, res: Response): void {
  const { device_id } = req.params;
  const db = getDatabase();

  const device = db.prepare(`
    SELECT d.*, p.name as patient_name
    FROM devices d
    LEFT JOIN patients p ON d.patient_id = p.id
    WHERE d.device_id = ? OR d.id = ?
  `).get(device_id, device_id) as Device | undefined;

  if (!device) {
    res.status(404).json({ success: false, error: 'Device not found.' });
    return;
  }

  let schedules: any[] = [];
  if (device.patient_id) {
    schedules = db.prepare(`
      SELECT s.*, m.name as medication_name, m.dosage, m.medicine_type
      FROM medication_schedules s
      JOIN medications m ON s.medication_id = m.id
      WHERE s.patient_id = ? AND s.active = 1
    `).all(device.patient_id);
  }

  res.json({
    success: true,
    device_id: device.device_id,
    patient_id: device.patient_id,
    firmware_version: device.firmware_version,
    compartments: JSON.parse(device.compartments_json || '[]'),
    schedules,
  });
}
