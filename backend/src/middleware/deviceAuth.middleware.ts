import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database.js';
import { Device } from '../models/types.js';

export interface DeviceRequest extends Request {
  device?: Device;
}

export function authenticateDevice(req: DeviceRequest, res: Response, next: NextFunction): void {
  const token = (req.headers['x-device-token'] as string) || (req.headers.authorization?.replace('Bearer ', ''));

  if (!token) {
    res.status(401).json({ success: false, error: 'Device authentication token required.' });
    return;
  }

  const db = getDatabase();
  const device = db.prepare('SELECT * FROM devices WHERE device_token = ?').get(token) as Device | undefined;

  if (!device) {
    res.status(401).json({ success: false, error: 'Invalid or unregistered hardware device token.' });
    return;
  }

  req.device = device;
  next();
}
