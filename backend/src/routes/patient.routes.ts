import { Router } from 'express';
import { getPatients, getPatientById, createPatient, updatePatient, addHealthRecord } from '../controllers/patient.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getPatients);
router.get('/:id', getPatientById);
router.post('/', requireRole(['admin', 'doctor']), createPatient);
router.put('/:id', requireRole(['admin', 'doctor']), updatePatient);
router.post('/:id/health-records', addHealthRecord);

export default router;
