import { Router } from 'express';
import {
  getAllDevices,
  getDeviceById,
  registerDevice,
  handleHeartbeat,
  handleDeviceEvents,
  triggerDispense,
  getDeviceConfig,
} from '../controllers/device.controller.js';

const router = Router();

// Device hardware endpoints
router.get('/', getAllDevices);
router.post('/register', registerDevice);
router.post('/heartbeat', handleHeartbeat);
router.post('/events', handleDeviceEvents);
router.post('/dispense', triggerDispense);
router.get('/:id', getDeviceById);
router.get('/:device_id/status', getDeviceById);
router.get('/:device_id/config', getDeviceConfig);

export default router;
