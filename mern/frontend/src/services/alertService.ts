import api from './api';
import { Alert } from '../types';

export const alertService = {
  async getAlerts(params?: { patientId?: string; severity?: string; status?: string; limit?: number }): Promise<{ alerts: Alert[]; unreadCount: number }> {
    const res = await api.get('/alerts', { params });
    return res.data;
  },

  async acknowledgeAlert(id: string): Promise<Alert> {
    const res = await api.post(`/alerts/${id}/acknowledge`);
    return res.data.alert;
  },

  async resolveAlert(id: string): Promise<Alert> {
    const res = await api.post(`/alerts/${id}/resolve`);
    return res.data.alert;
  },

  async markAllRead(): Promise<void> {
    await api.post('/alerts/read-all');
  },
};
