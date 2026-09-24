import { getDatabase } from '../db/database.js';
import { Device, DeviceCompartment, Medication } from '../models/types.js';
import { createAlert } from './alert.service.js';
import { emitEvent } from './socket.service.js';

export function decrementMedicationInventory(medicationId: string, quantityToDeduct: number = 1): Medication | null {
  const db = getDatabase();

  const med = db.prepare('SELECT * FROM medications WHERE id = ?').get(medicationId) as Medication | undefined;
  if (!med) return null;

  const newQuantity = Math.max(0, med.current_quantity - quantityToDeduct);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE medications
    SET current_quantity = ?, updated_at = ?
    WHERE id = ?
  `).run(newQuantity, now, medicationId);

  const updatedMed = db.prepare('SELECT * FROM medications WHERE id = ?').get(medicationId) as Medication;

  // Check if refill threshold reached
  if (newQuantity <= med.refill_threshold) {
    createAlert({
      patientId: med.patient_id,
      type: 'refill_required',
      severity: newQuantity <= 2 ? 'critical' : 'high',
      title: 'Medication Refill Alert',
      message: `Stock for ${med.name} (${med.dosage}) is low: ${newQuantity} left (Threshold: ${med.refill_threshold}). Please refill promptly.`,
    });

    emitEvent('inventory:refill_needed', {
      medicationId,
      medicationName: med.name,
      currentQuantity: newQuantity,
      refillThreshold: med.refill_threshold,
      patientId: med.patient_id,
    });
  }

  // Also update device compartment if linked
  updateDeviceCompartmentStock(med.patient_id, med.name, newQuantity);

  emitEvent('inventory:updated', updatedMed);
  return updatedMed;
}

export function updateDeviceCompartmentStock(patientId: string, medicationName: string, pillsRemaining: number): void {
  const db = getDatabase();
  const device = db.prepare('SELECT * FROM devices WHERE patient_id = ?').get(patientId) as Device | undefined;
  if (!device || !device.compartments_json) return;

  try {
    const compartments: DeviceCompartment[] = JSON.parse(device.compartments_json);
    let modified = false;
    for (const comp of compartments) {
      if (comp.medication_name && comp.medication_name.toLowerCase().includes(medicationName.toLowerCase())) {
        comp.pills_remaining = pillsRemaining;
        modified = true;
      }
    }
    if (modified) {
      db.prepare(`
        UPDATE devices
        SET compartments_json = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(compartments), new Date().toISOString(), device.id);
    }
  } catch (e) {
    console.error('Error updating compartment stock:', e);
  }
}
