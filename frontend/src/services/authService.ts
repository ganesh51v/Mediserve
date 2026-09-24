import api from './api';
import { User } from '../types';
import { firebaseAuthService } from './firebaseAuthService';
import { firestoreService } from './firestoreService';

export const authService = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await api.post('/auth/login', { email, password });

    // Non-blocking Firebase Auth sync
    try {
      await firebaseAuthService.login(email, password);
    } catch {
      try {
        if (res.data?.user) {
          await firebaseAuthService.register(
            email,
            password,
            res.data.user.name,
            res.data.user.role as any,
            { phone: res.data.user.phone, specialization: res.data.user.specialization }
          );
        }
      } catch (err) {
        console.debug('Firebase auth sync:', err);
      }
    }

    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await api.get('/auth/me');
    return res.data.user;
  },

  async register(data: { name: string; email: string; password: string; role: string; phone?: string; specialization?: string }): Promise<User> {
    const res = await api.post('/auth/register', data);

    // Non-blocking Firebase Auth sync
    try {
      await firebaseAuthService.register(
        data.email,
        data.password,
        data.name,
        data.role as any,
        { phone: data.phone, specialization: data.specialization }
      );
    } catch (e) {
      console.debug('Firebase user registration sync:', e);
    }

    return res.data.user;
  },

  async registerPatient(data: {
    name: string;
    date_of_birth: string;
    gender: string;
    phone?: string;
    address?: string;
    emergency_contact: string;
    emergency_phone: string;
    blood_group?: string;
    allergies?: string;
    medical_conditions?: string;
  }): Promise<{ success: boolean; patient: any; message: string }> {
    const res = await api.post('/auth/register-patient', data);

    // Non-blocking Cloud Firestore patient document sync
    if (res.data?.patient) {
      try {
        await firestoreService.syncPatient(res.data.patient);
      } catch (e) {
        console.debug('Firestore patient sync:', e);
      }
    }

    return res.data;
  },

  async getUsers(role?: string): Promise<User[]> {
    const res = await api.get('/auth/users', { params: { role } });
    return res.data.users;
  },

  async getSetupStatus(): Promise<{ success: boolean; isSetup: boolean; userCount: number }> {
    const res = await api.get('/auth/setup-status');
    return res.data;
  },
};
