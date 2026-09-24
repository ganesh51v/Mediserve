import api from './api';
import { Medication, MedicationEvent } from '../types';

export const medicationService = {
  async getMedications(params?: { patientId?: string; status?: string; q?: string }): Promise<Medication[]> {
    const res = await api.get('/medications', { params });
    return res.data.medications;
  },

  async createMedication(data: Partial<Medication>): Promise<Medication> {
    const res = await api.post('/medications', data);
    return res.data.medication;
  },

  async updateMedication(id: string, data: Partial<Medication>): Promise<Medication> {
    const res = await api.put(`/medications/${id}`, data);
    return res.data.medication;
  },

  async refillMedication(id: string, quantityToAdd: number): Promise<Medication> {
    const res = await api.post(`/medications/${id}/refill`, { quantityToAdd });
    return res.data.medication;
  },

  async recordDoseEvent(eventId: string, status: 'taken' | 'missed' | 'delayed' | 'skipped', notes?: string): Promise<MedicationEvent> {
    const res = await api.post('/medications/events/record', { eventId, status, notes });
    return res.data.event;
  },
};
