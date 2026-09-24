import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const firestoreService = {
  /**
   * Save or sync a patient to Firestore
   */
  async syncPatient(patient: {
    id: string;
    patient_code: string;
    name: string;
    date_of_birth: string;
    gender: string;
    phone?: string;
    emergency_contact: string;
    emergency_phone: string;
    blood_group?: string;
    allergies?: string;
    medical_conditions?: string;
    doctor_id?: string;
    caretaker_id?: string;
    status: string;
  }) {
    await setDoc(doc(db, 'patients', patient.id), {
      ...patient,
      synced_at: new Date().toISOString(),
    });
  },

  /**
   * Real-time subscription to patients list
   */
  subscribeToPatients(callback: (patients: any[]) => void) {
    const q = query(collection(db, 'patients'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(data);
    });
  },

  /**
   * Log an alert to Firestore in real-time
   */
  async createAlert(alert: {
    patient_id?: string;
    device_id?: string;
    alert_type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
  }) {
    return await addDoc(collection(db, 'alerts'), {
      ...alert,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  },

  /**
   * Real-time subscription to clinical alerts
   */
  subscribeToAlerts(callback: (alerts: any[]) => void) {
    const q = query(collection(db, 'alerts'), orderBy('created_at', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(data);
    });
  },

  /**
   * Update smart dispenser device status in Firestore
   */
  async syncDeviceStatus(device: {
    device_id: string;
    status: 'online' | 'warning' | 'offline';
    battery_level: number;
    signal_strength?: string;
    dispensing_status?: string;
  }) {
    await setDoc(
      doc(db, 'devices', device.device_id),
      {
        ...device,
        last_seen: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Real-time subscription to smart devices
   */
  subscribeToDevices(callback: (devices: any[]) => void) {
    const q = query(collection(db, 'devices'));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(data);
    });
  },
};
