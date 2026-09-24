import { Medication, IMedication } from '../models/Medication.js';
import { createAlert } from './alert.service.js';
import { notifyRefillNeeded } from './socket.service.js';

export async function checkInventoryLevels(medicationId: string): Promise<void> {
  const med = await Medication.findById(medicationId).populate('patient_id', 'name patient_code');
  if (!med) return;

  if (med.current_quantity <= med.refill_threshold) {
    const p: any = med.patient_id;
    const patientName = p?.name || 'Assigned Patient';

    await createAlert({
      patientId: med.patient_id.toString(),
      type: 'refill_required',
      severity: med.current_quantity === 0 ? 'critical' : 'high',
      title: `Low Stock Refill Needed: ${med.name}`,
      message: `Prescription "${med.name}" (${med.dosage}) for ${patientName} has only ${med.current_quantity} units remaining (Refill threshold: ${med.refill_threshold}).`,
    });

    notifyRefillNeeded({
      medicationId: med.id,
      patientId: med.patient_id.toString(),
      currentQuantity: med.current_quantity,
      refillThreshold: med.refill_threshold,
      medicationName: med.name,
    });
  }
}

export async function deductStock(medicationId: string, amount: number = 1): Promise<IMedication | null> {
  const med = await Medication.findById(medicationId);
  if (!med) return null;

  med.current_quantity = Math.max(0, med.current_quantity - amount);
  await med.save();

  await checkInventoryLevels(medicationId);
  return med;
}

export async function restockMedication(medicationId: string, amount: number): Promise<IMedication | null> {
  const med = await Medication.findById(medicationId);
  if (!med) return null;

  med.current_quantity += amount;
  await med.save();

  return med;
}
