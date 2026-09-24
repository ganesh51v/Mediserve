import { Router } from 'express';
import { getReportsSummary, exportCsvReport } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/summary', getReportsSummary);
router.get('/export/csv', exportCsvReport);

export default router;
