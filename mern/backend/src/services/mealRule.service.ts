import { Medication, MealRelation } from '../models/Medication.js';
import { MedicationEvent } from '../models/MedicationEvent.js';
import { Device } from '../models/Device.js';
import { createAlert } from './alert.service.js';
import { deductStock } from './inventory.service.js';
import { notifyDoseUpdate, notifyMealDetected, notifyDeviceUpdate } from './socket.service.js';

export interface MealValidationResult {
  valid: boolean;
  actionRequired: boolean;
  message: string;
}

export function validateMealTiming(
  mealRelation: MealRelation,
  detectedMeal: 'breakfast' | 'lunch' | 'dinner'
): MealValidationResult {
  const relationLower = mealRelation.toLowerCase();
  const mealLower = detectedMeal.toLowerCase();

  if (relationLower.includes(mealLower)) {
    return {
      valid: true,
      actionRequired: true,
      message: `Meal timing aligned: ${mealRelation} matched ${detectedMeal}.`,
    };
  }

  if (mealRelation === 'With Meal') {
    return {
      valid: true,
      actionRequired: true,
      message: `Meal timing aligned: ${mealRelation} applies to any detected meal (${detectedMeal}).`,
    };
  }

  if (mealRelation === 'Empty Stomach' || mealRelation === 'Custom Time') {
    return {
      valid: true,
      actionRequired: false,
      message: `Prescription requires ${mealRelation}. Not triggered by ${detectedMeal}.`,
    };
  }

  return {
    valid: false,
    actionRequired: false,
    message: `Meal mismatch: scheduled for ${mealRelation}, but ${detectedMeal} was detected.`,
  };
}

export async function processMealDetected(params: {
  patientId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  deviceId?: string;
}): Promise<{
  activatedDoses: any[];
  warnings: string[];
}> {
  const { patientId, mealType, deviceId } = params;
  const activatedDoses: any[] = [];
  const warnings: string[] = [];

  // Notify meal detection via WebSockets
  notifyMealDetected({ patientId, mealType, timestamp: new Date().toISOString() });

  // Find active medications for this patient
  const medications = await Medication.find({ patient_id: patientId, status: 'active' });

  for (const med of medications) {
    const check = validateMealTiming(med.meal_relation, mealType);

    if (check.actionRequired && check.valid) {
      // Find today's pending event or create one
      let event = await MedicationEvent.findOne({
        patient_id: patientId,
        medication_id: med._id,
        status: { $in: ['pending', 'delayed'] },
      }).sort({ scheduled_time: 1 });

      if (event) {
        event.status = 'dispensing';
        event.meal_context = `${mealType} detected`;
        event.dispensed_at = new Date();
        if (deviceId) event.device_id = deviceId;
        await event.save();

        const populatedEvent = await MedicationEvent.findById(event._id)
          .populate('medication_id', 'name dosage medicine_type')
          .populate('patient_id', 'name patient_code');

        activatedDoses.push(populatedEvent);
        notifyDoseUpdate({
          eventId: event.id,
          patientId,
          status: 'dispensing',
          medicationName: med.name,
          dosage: med.dosage,
        });
      }
    }
  }

  // Update device status if deviceId is provided
  if (deviceId) {
    const device = await Device.findOne({ device_id: deviceId });
    if (device) {
      device.last_seen = new Date();
      if (activatedDoses.length > 0) {
        device.dispensing_status = 'dispensing';
        device.last_dispense_time = new Date();
      }
      await device.save();
      notifyDeviceUpdate(device.toJSON());
    }
  }

  return { activatedDoses, warnings };
}

export async function processDoseTaken(params: {
  eventId?: string;
  patientId?: string;
  medicationId?: string;
}): Promise<any> {
  let event: any = null;

  if (params.eventId) {
    event = await MedicationEvent.findById(params.eventId);
  } else if (params.patientId && params.medicationId) {
    event = await MedicationEvent.findOne({
      patient_id: params.patientId,
      medication_id: params.medicationId,
      status: { $in: ['dispensing', 'dispensed', 'pending'] },
    }).sort({ scheduled_time: 1 });
  }

  if (!event) return null;

  event.status = 'taken';
  event.taken_at = new Date();
  await event.save();

  // Deduct pill from inventory
  await deductStock(event.medication_id.toString(), 1);

  // If there's an associated device, update compartment pills
  if (event.device_id) {
    const dev = await Device.findOne({ device_id: event.device_id });
    if (dev) {
      dev.dispensing_status = 'idle';
      const comp = dev.compartments.find(
        (c) => c.medication_id && c.medication_id.toString() === event.medication_id.toString()
      );
      if (comp && comp.pills_remaining > 0) {
        comp.pills_remaining -= 1;
      }
      await dev.save();
      notifyDeviceUpdate(dev.toJSON());
    }
  }

  const populated = await MedicationEvent.findById(event._id)
    .populate('medication_id', 'name dosage medicine_type')
    .populate('patient_id', 'name patient_code');

  notifyDoseUpdate({
    eventId: event.id,
    patientId: event.patient_id.toString(),
    status: 'taken',
    takenAt: event.taken_at,
  });

  return populated?.toJSON() || event.toJSON();
}

export async function checkMissedDoses(): Promise<number> {
  const now = new Date();
  const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);

  // Find events still pending or dispensing past scheduled time
  const staleEvents = await MedicationEvent.find({
    status: { $in: ['pending', 'dispensing'] },
    created_at: { $lte: thirtyMinsAgo },
  }).populate('patient_id', 'name patient_code')
    .populate('medication_id', 'name dosage');

  let missedCount = 0;

  for (const event of staleEvents) {
    event.status = 'missed';
    await event.save();
    missedCount++;

    const p: any = event.patient_id;
    const m: any = event.medication_id;

    await createAlert({
      patientId: event.patient_id ? event.patient_id.toString() : undefined,
      deviceId: event.device_id,
      type: 'medication_missed',
      severity: 'high',
      title: `Missed Dose: ${m?.name || 'Prescription'}`,
      message: `Patient ${p?.name || 'Patient'} missed scheduled dose of ${m?.name || 'Medication'} (${m?.dosage || ''}).`,
    });

    notifyDoseUpdate({
      eventId: event.id,
      patientId: event.patient_id.toString(),
      status: 'missed',
    });
  }

  return missedCount;
}
