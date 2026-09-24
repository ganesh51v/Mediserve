import { Router } from 'express';
import { getAlerts, acknowledgeAlert, resolveAlert, markAllAsRead } from '../controllers/alert.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getAlerts);
router.post('/read-all', markAllAsRead);
router.post('/:id/acknowledge', acknowledgeAlert);
router.post('/:id/resolve', resolveAlert);

export default router;
