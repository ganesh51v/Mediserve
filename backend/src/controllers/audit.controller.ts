import { Response } from 'express';
import { getDatabase } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export function getAuditLogs(req: AuthenticatedRequest, res: Response): void {
  const db = getDatabase();
  const { limit = 100, action, entityType } = req.query;

  let query = `
    SELECT 
      a.*,
      u.name as user_name,
      u.email as user_email,
      u.role as user_role
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (action) {
    query += ' AND a.action = ?';
    params.push(action);
  }

  if (entityType) {
    query += ' AND a.entity_type = ?';
    params.push(entityType);
  }

  query += ' ORDER BY a.created_at DESC LIMIT ?';
  params.push(Number(limit));

  const logs = db.prepare(query).all(...params);
  res.json({ success: true, count: logs.length, logs });
}
