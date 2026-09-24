import { Router, Request, Response, NextFunction } from 'express';
import { login, getMe, register, registerPatient, getUsers, getSetupStatus } from '../controllers/auth.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';
import { getDatabase } from '../db/database.js';

const router = Router();

const allowRegistration = (req: Request, res: Response, next: NextFunction) => {
  const role = req.body?.role;
  // Doctors and Caretakers can self-register from the public sign-up form
  if (role === 'doctor' || role === 'caretaker') {
    return next();
  }
  // Admin role is permitted for the first-time setup or requires an existing admin
  try {
    const db = getDatabase();
    const count = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
    if (count === 0) {
      return next();
    }
  } catch (e) {
    // If database check fails, fallback to strict auth
  }
  return authenticate(req as any, res, () => requireRole(['admin'])(req as any, res, next));
};

router.get('/setup-status', getSetupStatus);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, getMe);
router.post('/register', allowRegistration, register);
router.post('/register-patient', registerPatient);
router.get('/users', authenticate, getUsers);

export default router;
