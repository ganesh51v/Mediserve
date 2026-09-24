import { Router } from 'express';
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getHealthRecords,
  addHealthRecord,
} from '../controllers/patient.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, getPatients);
router.get('/:id', authenticate, getPatientById);
router.post('/', authenticate, requireRole(['admin', 'doctor']), createPatient);
router.put('/:id', authenticate, requireRole(['admin', 'doctor']), updatePatient);
router.delete('/:id', authenticate, requireRole(['admin']), deletePatient);
router.get('/:id/vitals', authenticate, getHealthRecords);
router.post('/:id/vitals', authenticate, addHealthRecord);

export default router;
