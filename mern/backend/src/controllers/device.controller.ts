import { Request, Response } from 'express';
import { Device, IDeviceCompartment } from '../models/Device.js';
import { Patient } from '../models/Patient.js';
import { createAlert } from '../services/alert.service.js';
import { processMealDetected, processDoseTaken } from '../services/mealRule.service.js';
import { notifyDeviceUpdate } from '../services/socket.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { v4 as uuidv4 } from 'uuid';

export async function getDevices(req: AuthenticatedRequest, res: Response): Promise<void> {
  const devices = await Device.find().populate('patient_id', 'name patient_code').sort({ device_id: 1 });

  const enriched = devices.map((d) => {
    const dObj: any = d.toJSON();
    if (d.patient_id) {
      const p: any = d.patient_id;
      dObj.patient_name = p.name;
      dObj.patient_code = p.patient_code;
    }
    return dObj;
  });

  res.json({ success: true, devices: enriched });
}

export async function getDeviceById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const device = await Device.findOne({ $or: [{ _id: id }, { device_id: id }] })
    .populate('patient_id', 'name patient_code');

  if (!device) {
    res.status(404).json({ success: false, error: 'Device not found.' });
    return;
  }

  const dObj: any = device.toJSON();
  if (device.patient_id) {
    const p: any = device.patient_id;
    dObj.patient_name = p.name;
    dObj.patient_code = p.patient_code;
  }

  res.json({ success: true, device: dObj });
}

export async function registerDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { device_id, patient_id, firmware_version } = req.body;

  if (!device_id) {
    res.status(400).json({ success: false, error: 'Device ID serial is required.' });
    return;
  }

  const existing = await Device.findOne({ device_id: device_id.toUpperCase().trim() });
  if (existing) {
    res.status(409).json({ success: false, error: 'Device serial number is already registered.' });
    return;
  }

  // Create default 6 compartments
  const defaultCompartments: IDeviceCompartment[] = [1, 2, 3, 4, 5, 6].map((num) => ({
    compartment: num,
    capacity: 30,
    pills_remaining: 0,
  }));

  const device = await Device.create({
    device_id: device_id.toUpperCase().trim(),
    patient_id: patient_id || undefined,
    status: 'online',
    battery_level: 100,
    signal_strength: 'strong',
    firmware_version: firmware_version || 'v2.4.1',
    last_seen: new Date(),
    compartments: defaultCompartments,
    dispensing_status: 'idle',
    device_token: uuidv4(),
  });

  res.status(201).json({ success: true, device: device.toJSON() });
}

export async function heartbeat(req: Request, res: Response): Promise<void> {
  const { device_id, battery_level, signal_strength } = req.body;

  if (!device_id) {
    res.status(400).json({ success: false, error: 'device_id is required.' });
    return;
  }

  const device = await Device.findOne({ device_id });
  if (!device) {
    res.status(404).json({ success: false, error: 'Device not registered.' });
    return;
  }

  device.last_seen = new Date();
  if (battery_level !== undefined) device.battery_level = Number(battery_level);
  if (signal_strength !== undefined) device.signal_strength = signal_strength;

  if (device.battery_level < 20 && device.status !== 'warning') {
    device.status = 'warning';
    await createAlert({
      deviceId: device.device_id,
      patientId: device.patient_id ? device.patient_id.toString() : undefined,
      type: 'device_offline',
      severity: 'high',
      title: `Low Battery Warning: ${device.device_id}`,
      message: `Dispenser hardware ${device.device_id} battery level dropped to ${device.battery_level}%. Recharge required.`,
    });
  } else if (device.battery_level >= 20 && device.status === 'warning') {
    device.status = 'online';
  }

  await device.save();
  notifyDeviceUpdate(device.toJSON());

  res.json({
    success: true,
    status: device.status,
    serverTime: new Date().toISOString(),
  });
}

export async function deviceEvent(req: Request, res: Response): Promise<void> {
  const { event_type, device_id, patient_id, meal_type, payload } = req.body;

  if (!event_type || !device_id) {
    res.status(400).json({ success: false, error: 'event_type and device_id are required.' });
    return;
  }

  const device = await Device.findOne({ device_id });
  if (!device) {
    res.status(404).json({ success: false, error: 'Device not recognized.' });
    return;
  }

  const targetPatientId = patient_id || (device.patient_id ? device.patient_id.toString() : null);

  switch (event_type) {
    case 'MEAL_DETECTED':
    case 'DEVICE_MEAL_DETECTED': {
      if (!targetPatientId) {
        res.status(400).json({ success: false, error: 'Patient not assigned to this hardware unit.' });
        return;
      }
      const meal = meal_type || 'breakfast';
      const result = await processMealDetected({
        patientId: targetPatientId,
        mealType: meal,
        deviceId: device.device_id,
      });

      res.json({
        success: true,
        message: `Meal event "${meal}" processed.`,
        activatedDoses: result.activatedDoses,
      });
      return;
    }

    case 'DOSE_TAKEN': {
      const result = await processDoseTaken({
        patientId: targetPatientId || undefined,
        medicationId: payload?.medication_id,
        eventId: payload?.event_id,
      });

      res.json({ success: true, message: 'Dose marked as taken.', event: result });
      return;
    }

    case 'DOSE_DISPENSED': {
      device.dispensing_status = 'idle';
      device.last_dispense_time = new Date();
      await device.save();
      notifyDeviceUpdate(device.toJSON());

      res.json({ success: true, message: 'Dose dispense confirmed.' });
      return;
    }

    case 'DEVICE_OFFLINE': {
      device.status = 'offline';
      await device.save();

      await createAlert({
        deviceId: device.device_id,
        patientId: targetPatientId || undefined,
        type: 'device_offline',
        severity: 'critical',
        title: `Hardware Offline Alert: ${device.device_id}`,
        message: `Dispenser unit ${device.device_id} lost cloud connectivity. Automatic dispensing paused.`,
      });

      notifyDeviceUpdate(device.toJSON());
      res.json({ success: true, message: 'Device marked offline.' });
      return;
    }

    case 'DEVICE_ONLINE': {
      device.status = 'online';
      await device.save();
      notifyDeviceUpdate(device.toJSON());
      res.json({ success: true, message: 'Device marked online.' });
      return;
    }

    case 'DISPENSER_ERROR': {
      device.status = 'warning';
      device.dispensing_status = 'error';
      device.error_message = payload?.error || 'Dispenser motor jam detected.';
      await device.save();

      await createAlert({
        deviceId: device.device_id,
        patientId: targetPatientId || undefined,
        type: 'dispenser_error',
        severity: 'critical',
        title: `Hardware Fault: ${device.device_id}`,
        message: `Dispenser error reported: ${device.error_message}`,
      });

      notifyDeviceUpdate(device.toJSON());
      res.json({ success: true, message: 'Fault logged.' });
      return;
    }

    default:
      res.status(400).json({ success: false, error: `Unknown event_type: ${event_type}` });
  }
}

export async function dispenseAck(req: Request, res: Response): Promise<void> {
  const { device_id, success, error } = req.body;

  const device = await Device.findOne({ device_id });
  if (device) {
    device.dispensing_status = success ? 'idle' : 'error';
    if (!success && error) device.error_message = error;
    await device.save();
    notifyDeviceUpdate(device.toJSON());
  }

  res.json({ success: true, message: 'Dispensing acknowledgment recorded.' });
}
