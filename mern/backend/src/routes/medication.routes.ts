import { Router } from 'express';
import {
  getMedications,
  getMedicationById,
  createMedication,
  updateMedication,
  deleteMedication,
  refillMedication,
  getSchedules,
  getEvents,
} from '../controllers/medication.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, getMedications);
router.get('/schedules', authenticate, getSchedules);
router.get('/events', authenticate, getEvents);
router.get('/:id', authenticate, getMedicationById);
router.post('/', authenticate, requireRole(['doctor', 'admin']), createMedication);
router.put('/:id', authenticate, requireRole(['doctor', 'admin']), updateMedication);
router.delete('/:id', authenticate, requireRole(['doctor', 'admin']), deleteMedication);
router.post('/:id/refill', authenticate, refillMedication);

export default router;
