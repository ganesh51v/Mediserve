import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database.js';
import { Medication, MedicationEvent, MedicationSchedule } from '../models/types.js';
import { createAlert } from './alert.service.js';
import { decrementMedicationInventory } from './inventory.service.js';
import { emitEvent, emitToPatient } from './socket.service.js';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export function getMatchingMealRelations(mealType: MealType): string[] {
  switch (mealType.toLowerCase()) {
    case 'breakfast':
      return ['After Breakfast', 'With Meal'];
    case 'lunch':
      return ['After Lunch', 'With Meal'];
    case 'dinner':
      return ['After Dinner', 'With Meal'];
    default:
      return [];
  }
}

export function processMealDetected(params: {
  patientId: string;
  mealType: MealType;
  detectedAt?: string;
  deviceId?: string;
}): { activatedDoses: MedicationEvent[]; warnings: string[] } {
  const db = getDatabase();
  const now = params.detectedAt ? new Date(params.detectedAt) : new Date();
  const todayStr = now.toISOString().split('T')[0];
  const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const targetRelations = getMatchingMealRelations(params.mealType);
  const placeholders = targetRelations.map(() => '?').join(',');

  // Query medications for patient matching these meal relations
  const medications = db.prepare(`
    SELECT m.*
    FROM medications m
    WHERE m.patient_id = ? AND m.status = 'active'
      AND m.meal_relation IN (${placeholders})
  `).all(params.patientId, ...targetRelations) as Medication[];

  const activatedDoses: MedicationEvent[] = [];
  const warnings: string[] = [];

  for (const med of medications) {
    // Check if an event already exists for today
    let event = db.prepare(`
      SELECT * FROM medication_events
      WHERE patient_id = ? AND medication_id = ?
        AND scheduled_time LIKE ?
      ORDER BY scheduled_time DESC LIMIT 1
    `).get(params.patientId, med.id, `${todayStr}%`) as MedicationEvent | undefined;

    if (!event) {
      // Create new event for today's meal
      const eventId = uuidv4();
      const schedTime = `${todayStr}T${med.scheduled_time || '08:00'}:00Z`;

      db.prepare(`
        INSERT INTO medication_events (id, patient_id, medication_id, device_id, scheduled_time, dispensed_at, status, meal_context, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'dispensing', ?, ?, ?)
      `).run(
        eventId,
        params.patientId,
        med.id,
        params.deviceId || null,
        schedTime,
        now.toISOString(),
        `${params.mealType.toUpperCase()} detected at ${formattedTime}`,
        `Automatically activated by Meal-Aware System (${med.meal_relation})`,
        now.toISOString()
      );

      event = db.prepare('SELECT * FROM medication_events WHERE id = ?').get(eventId) as MedicationEvent;
    } else if (event.status === 'pending') {
      // Transition from pending to dispensing
      db.prepare(`
        UPDATE medication_events
        SET status = 'dispensing', dispensed_at = ?, meal_context = ?, notes = ?
        WHERE id = ?
      `).run(
        now.toISOString(),
        `${params.mealType.toUpperCase()} detected at ${formattedTime}`,
        `Triggered by smart dispenser meal detector`,
        event.id
      );

      event = db.prepare('SELECT * FROM medication_events WHERE id = ?').get(event.id) as MedicationEvent;
    }

    if (event) {
      activatedDoses.push(event);

      // Decrement inventory on dispense
      decrementMedicationInventory(med.id, 1);
    }
  }

  // Update device status if deviceId given
  if (params.deviceId) {
    db.prepare(`
      UPDATE devices
      SET dispensing_status = 'dispensing', last_dispense_time = ?, last_seen = ?
      WHERE id = ? OR device_id = ?
    `).run(now.toISOString(), now.toISOString(), params.deviceId, params.deviceId);
  }

  // Notify real-time clients
  emitToPatient(params.patientId, 'meal:detected', {
    patientId: params.patientId,
    mealType: params.mealType,
    time: now.toISOString(),
    activatedCount: activatedDoses.length,
    activatedDoses,
  });

  emitEvent('dose:status_update', {
    patientId: params.patientId,
    status: 'dispensing',
    events: activatedDoses,
  });

  return { activatedDoses, warnings };
}

export function processDoseTaken(params: {
  patientId: string;
  medicationId: string;
  eventId?: string;
  takenAt?: string;
}): MedicationEvent | null {
  const db = getDatabase();
  const now = params.takenAt ? new Date(params.takenAt).toISOString() : new Date().toISOString();

  let event: MedicationEvent | undefined;

  if (params.eventId) {
    event = db.prepare('SELECT * FROM medication_events WHERE id = ?').get(params.eventId) as MedicationEvent | undefined;
  } else {
    // Get latest active/pending/dispensing event
    event = db.prepare(`
      SELECT * FROM medication_events
      WHERE patient_id = ? AND medication_id = ?
        AND status IN ('pending', 'dispensing', 'dispensed')
      ORDER BY scheduled_time DESC LIMIT 1
    `).get(params.patientId, params.medicationId) as MedicationEvent | undefined;
  }

  if (event) {
    db.prepare(`
      UPDATE medication_events
      SET status = 'taken', taken_at = ?
      WHERE id = ?
    `).run(now, event.id);

    // Reset device dispensing status
    if (event.device_id) {
      db.prepare(`
        UPDATE devices
        SET dispensing_status = 'idle', last_seen = ?
        WHERE id = ?
      `).run(now, event.device_id);
    }

    const updated = db.prepare(`
      SELECT e.*, p.name as patient_name, m.name as medication_name, m.dosage
      FROM medication_events e
      JOIN patients p ON e.patient_id = p.id
      JOIN medications m ON e.medication_id = m.id
      WHERE e.id = ?
    `).get(event.id) as MedicationEvent;

    emitEvent('dose:status_update', {
      patientId: params.patientId,
      medicationId: params.medicationId,
      status: 'taken',
      event: updated,
    });

    return updated;
  }

  return null;
}

export function processDoseMissed(params: {
  patientId: string;
  medicationId: string;
  eventId?: string;
  reason?: string;
}): MedicationEvent | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  let event: MedicationEvent | undefined;

  if (params.eventId) {
    event = db.prepare('SELECT * FROM medication_events WHERE id = ?').get(params.eventId) as MedicationEvent | undefined;
  } else {
    event = db.prepare(`
      SELECT * FROM medication_events
      WHERE patient_id = ? AND medication_id = ?
        AND status IN ('pending', 'dispensing')
      ORDER BY scheduled_time DESC LIMIT 1
    `).get(params.patientId, params.medicationId) as MedicationEvent | undefined;
  }

  if (event) {
    db.prepare(`
      UPDATE medication_events
      SET status = 'missed', notes = ?
      WHERE id = ?
    `).run(params.reason || 'Dose missed by patient', event.id);

    const med = db.prepare('SELECT name, dosage FROM medications WHERE id = ?').get(params.medicationId) as { name: string; dosage: string } | undefined;
    const pat = db.prepare('SELECT name FROM patients WHERE id = ?').get(params.patientId) as { name: string } | undefined;

    // Generate high priority alert
    createAlert({
      patientId: params.patientId,
      deviceId: event.device_id,
      type: 'medication_missed',
      severity: 'high',
      title: 'Medication Missed Alert',
      message: `${pat?.name || 'Patient'} missed scheduled dose of ${med?.name || 'Medication'} (${med?.dosage || ''}).`,
    });

    const updated = db.prepare(`
      SELECT e.*, p.name as patient_name, m.name as medication_name, m.dosage
      FROM medication_events e
      JOIN patients p ON e.patient_id = p.id
      JOIN medications m ON e.medication_id = m.id
      WHERE e.id = ?
    `).get(event.id) as MedicationEvent;

    emitEvent('dose:status_update', {
      patientId: params.patientId,
      medicationId: params.medicationId,
      status: 'missed',
      event: updated,
    });

    return updated;
  }

  return null;
}

export function validateMealTiming(mealRelation: string, contextMeal: string): { valid: boolean; reason?: string } {
  const relationLower = mealRelation.toLowerCase();
  const contextLower = contextMeal.toLowerCase();

  if (relationLower.includes('breakfast') && !contextLower.includes('breakfast')) {
    return { valid: false, reason: `Medication requires breakfast relation, but current meal is ${contextMeal}` };
  }
  if (relationLower.includes('lunch') && !contextLower.includes('lunch')) {
    return { valid: false, reason: `Medication requires lunch relation, but current meal is ${contextMeal}` };
  }
  if (relationLower.includes('dinner') && !contextLower.includes('dinner')) {
    return { valid: false, reason: `Medication requires dinner relation, but current meal is ${contextMeal}` };
  }
  return { valid: true };
}
