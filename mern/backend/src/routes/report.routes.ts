import { Router } from 'express';
import { getReportsSummary, downloadCsv } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/summary', authenticate, getReportsSummary);
router.get('/export', authenticate, downloadCsv);

export default router;
