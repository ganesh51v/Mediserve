import api from './api';
import { Device } from '../types';

export const deviceService = {
  async getDevices(): Promise<Device[]> {
    const res = await api.get('/device');
    return res.data.devices;
  },

  async getDeviceById(id: string): Promise<Device> {
    const res = await api.get(`/device/${id}`);
    return res.data.device;
  },

  async triggerDispense(deviceId: string, medicationId?: string, compartment?: number): Promise<any> {
    const res = await api.post('/device/dispense', {
      device_id: deviceId,
      medication_id: medicationId,
      compartment,
    });
    return res.data;
  },

  async sendDeviceEvent(eventData: {
    event_type: string;
    device_id?: string;
    patient_id?: string;
    medication_id?: string;
    event_id?: string;
    meal_type?: string;
    payload?: any;
  }): Promise<any> {
    const res = await api.post('/device/events', eventData);
    return res.data;
  },

  async sendHeartbeat(deviceId: string, batteryLevel: number, signalStrength: string): Promise<any> {
    const res = await api.post('/device/heartbeat', {
      device_id: deviceId,
      battery_level: batteryLevel,
      signal_strength: signalStrength,
    });
    return res.data;
  },
};
