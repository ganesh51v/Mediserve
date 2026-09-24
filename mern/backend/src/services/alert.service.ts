import { Alert, IAlert, AlertType, AlertSeverity } from '../models/Alert.js';
import { notifyAlertNew } from './socket.service.js';

interface CreateAlertParams {
  patientId?: string;
  deviceId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
}

export async function createAlert(params: CreateAlertParams): Promise<IAlert> {
  const alert = new Alert({
    patient_id: params.patientId,
    device_id: params.deviceId,
    type: params.type,
    severity: params.severity,
    title: params.title,
    message: params.message,
    status: 'unread',
  });

  await alert.save();
  await alert.populate([
    { path: 'patient_id', select: 'name patient_code' },
    { path: 'acknowledged_by', select: 'name role' },
  ]);

  const alertObj: any = alert.toJSON();
  if (alert.patient_id) {
    const p: any = alert.patient_id;
    alertObj.patient_name = p.name;
    alertObj.patient_code = p.patient_code;
  }

  notifyAlertNew(alertObj);
  return alert;
}
