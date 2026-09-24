import { describe, it, expect, beforeAll } from 'vitest';
import { processMealDetected, processDoseTaken, validateMealTiming } from '../src/services/mealRule.service.js';
import { getDatabase } from '../src/db/database.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Meal-Aware Medication Rule Engine', () => {
  beforeAll(() => {
    seedDatabase();
  });

  it('validates meal timing relationships correctly', () => {
    expect(validateMealTiming('After Breakfast', 'breakfast').valid).toBe(true);
    expect(validateMealTiming('After Breakfast', 'dinner').valid).toBe(false);
    expect(validateMealTiming('Before Lunch', 'lunch').valid).toBe(true);
  });

  it('processes meal detection and activates scheduled medications', () => {
    const db = getDatabase();
    // Get patient with After Breakfast medicine (Robert Chen P-1001)
    const patient = db.prepare('SELECT id FROM patients WHERE patient_code = ?').get('P-1001') as { id: string };

    // Set today's event to pending for testing activation using parameter placeholder
    db.prepare('UPDATE medication_events SET status = ? WHERE patient_id = ?').run('pending', patient.id);

    const result = processMealDetected({
      patientId: patient.id,
      mealType: 'breakfast',
    });

    expect(result).toBeDefined();
    expect(result.activatedDoses.length).toBeGreaterThanOrEqual(1);
    expect(result.activatedDoses[0].status).toBe('dispensing');
  });

  it('records dose taken and updates state', () => {
    const db = getDatabase();
    const patient = db.prepare('SELECT id FROM patients WHERE patient_code = ?').get('P-1001') as { id: string };
    const med = db.prepare('SELECT id FROM medications WHERE patient_id = ? LIMIT 1').get(patient.id) as { id: string };

    // Ensure status is dispensing so it is eligible to be taken
    db.prepare('UPDATE medication_events SET status = ? WHERE patient_id = ? AND medication_id = ?').run('dispensing', patient.id, med.id);

    const event = processDoseTaken({
      patientId: patient.id,
      medicationId: med.id,
    });

    expect(event).toBeDefined();
    expect(event?.status).toBe('taken');
    expect(event?.taken_at).toBeDefined();
  });
});
