import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { processMealDetected, processDoseTaken, validateMealTiming } from '../src/services/mealRule.service.js';
import { Patient } from '../src/models/Patient.js';
import { Medication } from '../src/models/Medication.js';
import { MedicationEvent } from '../src/models/MedicationEvent.js';
import { seedDatabase } from '../src/db/seed.js';
import { closeDB } from '../src/db/connection.js';

describe('MediServe MERN Meal-Aware Medication Rule Engine', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await closeDB();
  });

  it('validates meal timing relationships correctly', () => {
    expect(validateMealTiming('After Breakfast', 'breakfast').valid).toBe(true);
    expect(validateMealTiming('After Breakfast', 'dinner').valid).toBe(false);
    expect(validateMealTiming('Before Lunch', 'lunch').valid).toBe(true);
    expect(validateMealTiming('With Meal', 'dinner').valid).toBe(true);
  });

  it('processes meal detection and activates scheduled medications', async () => {
    const patient = await Patient.findOne({ patient_code: 'P-1001' });
    expect(patient).toBeDefined();

    // Reset status to pending for testing
    await MedicationEvent.updateMany({ patient_id: patient!._id }, { status: 'pending' });

    const result = await processMealDetected({
      patientId: patient!.id,
      mealType: 'breakfast',
    });

    expect(result).toBeDefined();
    expect(result.activatedDoses.length).toBeGreaterThanOrEqual(1);
    expect(result.activatedDoses[0].status).toBe('dispensing');
  });

  it('records dose taken and updates state', async () => {
    const patient = await Patient.findOne({ patient_code: 'P-1001' });
    const med = await Medication.findOne({ patient_id: patient!._id });

    // Set status to dispensing so it is eligible to be taken
    await MedicationEvent.updateOne(
      { patient_id: patient!._id, medication_id: med!._id },
      { status: 'dispensing' }
    );

    const event = await processDoseTaken({
      patientId: patient!.id,
      medicationId: med!.id,
    });

    expect(event).toBeDefined();
    expect(event?.status).toBe('taken');
    expect(event?.taken_at).toBeDefined();
  });
});
