import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database.js';
import { Alert, AlertSeverity, AlertType } from '../models/types.js';
import { emitEvent } from './socket.service.js';

export function createAlert(params: {
  patientId?: string;
  deviceId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
}): Alert {
  const db = getDatabase();
  const alertId = uuidv4();
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO alerts (id, patient_id, device_id, type, severity, title, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'unread', ?)
  `);

  insert.run(
    alertId,
    params.patientId || null,
    params.deviceId || null,
    params.type,
    params.severity,
    params.title,
    params.message,
    now
  );

  const alert = db.prepare(`
    SELECT a.*, p.name as patient_name, p.patient_code
    FROM alerts a
    LEFT JOIN patients p ON a.patient_id = p.id
    WHERE a.id = ?
  `).get(alertId) as Alert;

  emitEvent('alert:new', alert);
  return alert;
}

export function acknowledgeAlert(alertId: string, userId: string): Alert | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE alerts
    SET status = 'acknowledged', acknowledged_by = ?, acknowledged_at = ?
    WHERE id = ?
  `).run(userId, now, alertId);

  const updated = db.prepare(`
    SELECT a.*, p.name as patient_name, p.patient_code, u.name as acknowledged_by_name
    FROM alerts a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN users u ON a.acknowledged_by = u.id
    WHERE a.id = ?
  `).get(alertId) as Alert;

  if (updated) {
    emitEvent('alert:updated', updated);
  }
  return updated;
}

export function resolveAlert(alertId: string): Alert | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE alerts
    SET status = 'resolved', resolved_at = ?
    WHERE id = ?
  `).run(now, alertId);

  const updated = db.prepare(`
    SELECT a.*, p.name as patient_name, p.patient_code
    FROM alerts a
    LEFT JOIN patients p ON a.patient_id = p.id
    WHERE a.id = ?
  `).get(alertId) as Alert;

  if (updated) {
    emitEvent('alert:updated', updated);
  }
  return updated;
}
