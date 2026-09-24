import { Router } from 'express';
import {
  getDevices,
  getDeviceById,
  registerDevice,
  heartbeat,
  deviceEvent,
  dispenseAck,
} from '../controllers/device.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, getDevices);
router.get('/:id', authenticate, getDeviceById);
router.post('/', authenticate, requireRole(['admin']), registerDevice);

// IoT hardware direct access endpoints
router.post('/heartbeat', heartbeat);
router.post('/events', deviceEvent);
router.post('/dispense-ack', dispenseAck);

export default router;
