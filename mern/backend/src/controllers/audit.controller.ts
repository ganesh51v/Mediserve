import { Response } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export async function getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { action, limit } = req.query;
  const filter: any = {};
  if (action) filter.action = action;

  const max = limit ? parseInt(String(limit), 10) : 100;

  const logs = await AuditLog.find(filter)
    .populate('user_id', 'name email role')
    .sort({ created_at: -1 })
    .limit(max);

  const enriched = logs.map((l) => {
    const lObj: any = l.toJSON();
    if (l.user_id) {
      const u: any = l.user_id;
      lObj.user_name = u.name;
      lObj.user_email = u.email;
      lObj.user_role = u.role;
    }
    return lObj;
  });

  res.json({ success: true, logs: enriched });
}
