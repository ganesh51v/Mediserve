import { Response } from 'express';
import { Alert } from '../models/Alert.js';
import { notifyAlertAcknowledged } from '../services/socket.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export async function getAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { status, severity, patientId, limit } = req.query;
  const filter: any = {};

  if (status) filter.status = status;
  if (severity) filter.severity = severity;
  if (patientId) filter.patient_id = patientId;

  const max = limit ? parseInt(String(limit), 10) : 50;

  const alerts = await Alert.find(filter)
    .populate('patient_id', 'name patient_code')
    .populate('acknowledged_by', 'name role')
    .sort({ created_at: -1 })
    .limit(max);

  const enriched = alerts.map((a) => {
    const aObj: any = a.toJSON();
    if (a.patient_id) {
      const p: any = a.patient_id;
      aObj.patient_name = p.name;
      aObj.patient_code = p.patient_code;
    }
    if (a.acknowledged_by) {
      const u: any = a.acknowledged_by;
      aObj.acknowledged_by_name = u.name;
    }
    return aObj;
  });

  const unreadCount = await Alert.countDocuments({ status: 'unread' });

  res.json({
    success: true,
    alerts: enriched,
    unreadCount,
  });
}

export async function acknowledgeAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const alert = await Alert.findById(id);
  if (!alert) {
    res.status(404).json({ success: false, error: 'Alert not found.' });
    return;
  }

  alert.status = 'acknowledged';
  alert.acknowledged_by = (req.user?.userId as any) || undefined;
  alert.acknowledged_at = new Date();
  await alert.save();

  await alert.populate([
    { path: 'patient_id', select: 'name patient_code' },
    { path: 'acknowledged_by', select: 'name role' },
  ]);

  const aObj: any = alert.toJSON();
  if (alert.patient_id) {
    const p: any = alert.patient_id;
    aObj.patient_name = p.name;
    aObj.patient_code = p.patient_code;
  }
  if (alert.acknowledged_by) {
    const u: any = alert.acknowledged_by;
    aObj.acknowledged_by_name = u.name;
  }

  notifyAlertAcknowledged(aObj);
  res.json({ success: true, alert: aObj });
}

export async function resolveAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const alert = await Alert.findById(id);
  if (!alert) {
    res.status(404).json({ success: false, error: 'Alert not found.' });
    return;
  }

  alert.status = 'resolved';
  alert.resolved_at = new Date();
  await alert.save();

  res.json({ success: true, alert: alert.toJSON() });
}
