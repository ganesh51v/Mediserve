import api from './api';
import { Patient, Medication, MedicationSchedule, MedicationEvent, Device, HealthRecord, Alert, AdherenceReport } from '../types';

export interface PatientDetailResponse {
  patient: Patient;
  medications: Medication[];
  schedules: MedicationSchedule[];
  todayEvents: MedicationEvent[];
  device?: Device;
  healthRecords: HealthRecord[];
  alerts: Alert[];
  adherence: AdherenceReport;
}

export const patientService = {
  async getPatients(params?: { q?: string; doctorId?: string; caretakerId?: string; status?: string }): Promise<Patient[]> {
    const res = await api.get('/patients', { params });
    return res.data.patients;
  },

  async getPatientById(id: string): Promise<PatientDetailResponse> {
    const res = await api.get(`/patients/${id}`);
    return res.data;
  },

  async createPatient(data: Partial<Patient>): Promise<Patient> {
    const res = await api.post('/patients', data);
    return res.data.patient;
  },

  async updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
    const res = await api.put(`/patients/${id}`, data);
    return res.data.patient;
  },

  async addHealthRecord(patientId: string, data: Partial<HealthRecord>): Promise<HealthRecord> {
    const res = await api.post(`/patients/${patientId}/health-records`, data);
    return res.data.healthRecord;
  },
};
