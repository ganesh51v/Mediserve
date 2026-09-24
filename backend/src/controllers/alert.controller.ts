import { Response } from 'express';
import { getDatabase } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { acknowledgeAlert as ackService, resolveAlert as resolveService } from '../services/alert.service.js';

export function getAlerts(req: AuthenticatedRequest, res: Response): void {
  const db = getDatabase();
  const { patientId, severity, status, limit = 50 } = req.query;

  let query = `
    SELECT 
      a.*,
      p.name as patient_name,
      p.patient_code,
      dev.device_id as hardware_code,
      u.name as acknowledged_by_name
    FROM alerts a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN devices dev ON a.device_id = dev.id
    LEFT JOIN users u ON a.acknowledged_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Scoping for caretaker
  if (req.user?.role === 'caretaker') {
    query += ' AND (p.caretaker_id = ? OR p.caretaker_id IS NULL)';
    params.push(req.user.userId);
  } else if (req.user?.role === 'doctor') {
    query += ' AND (p.doctor_id = ? OR p.doctor_id IS NULL)';
    params.push(req.user.userId);
  }

  if (patientId) {
    query += ' AND a.patient_id = ?';
    params.push(patientId);
  }

  if (severity) {
    query += ' AND a.severity = ?';
    params.push(severity);
  }

  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }

  query += ' ORDER BY a.created_at DESC LIMIT ?';
  params.push(Number(limit));

  const alerts = db.prepare(query).all(...params);

  // Unread count
  const unreadCount = (db.prepare('SELECT COUNT(*) as c FROM alerts WHERE status = "unread"').get() as { c: number }).c;

  res.json({ success: true, count: alerts.length, unreadCount, alerts });
}

export function acknowledgeAlert(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;
  const userId = req.user?.userId || '';

  const updated = ackService(id, userId);
  if (!updated) {
    res.status(404).json({ success: false, error: 'Alert not found.' });
    return;
  }

  res.json({ success: true, alert: updated });
}

export function resolveAlert(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;

  const updated = resolveService(id);
  if (!updated) {
    res.status(404).json({ success: false, error: 'Alert not found.' });
    return;
  }

  res.json({ success: true, alert: updated });
}

export function markAllAsRead(_req: AuthenticatedRequest, res: Response): void {
  const db = getDatabase();
  db.prepare("UPDATE alerts SET status = 'read' WHERE status = 'unread'").run();
  res.json({ success: true, message: 'All alerts marked as read.' });
}
