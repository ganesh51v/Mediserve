import { Router } from 'express';
import {
  getMedications,
  createMedication,
  updateMedication,
  refillMedication,
  recordDoseEvent,
} from '../controllers/medication.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getMedications);
router.post('/', requireRole(['admin', 'doctor']), createMedication);
router.put('/:id', requireRole(['admin', 'doctor']), updateMedication);
router.post('/:id/refill', refillMedication);
router.post('/events/record', recordDoseEvent);

export default router;
