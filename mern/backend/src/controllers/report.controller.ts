import { Response } from 'express';
import { calculateAdherence } from '../services/adherence.service.js';
import { MedicationEvent } from '../models/MedicationEvent.js';
import { Medication } from '../models/Medication.js';
import { Device } from '../models/Device.js';
import { Alert } from '../models/Alert.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export async function getReportsSummary(_req: AuthenticatedRequest, res: Response): Promise<void> {
  const [adherence, missedDoses, medications, devices, alerts] = await Promise.all([
    calculateAdherence(),
    MedicationEvent.find({ status: 'missed' })
      .populate('patient_id', 'name patient_code')
      .populate('medication_id', 'name dosage')
      .sort({ created_at: -1 })
      .limit(10),
    Medication.find().populate('patient_id', 'name patient_code'),
    Device.find().populate('patient_id', 'name patient_code'),
    Alert.find().sort({ created_at: -1 }).limit(10),
  ]);

  const lowStock = medications.filter((m) => m.current_quantity <= m.refill_threshold);
  const onlineDevices = devices.filter((d) => d.status === 'online').length;
  const offlineDevices = devices.filter((d) => d.status === 'offline').length;

  res.json({
    success: true,
    adherence,
    missedDoses: missedDoses.map((m) => {
      const mObj: any = m.toJSON();
      if (m.patient_id) {
        const p: any = m.patient_id;
        mObj.patient_name = p.name;
        mObj.patient_code = p.patient_code;
      }
      if (m.medication_id) {
        const med: any = m.medication_id;
        mObj.medication_name = med.name;
        mObj.dosage = med.dosage;
      }
      return mObj;
    }),
    inventory: {
      total: medications.length,
      lowStockCount: lowStock.length,
      lowStockMeds: lowStock.map((m) => {
        const mObj: any = m.toJSON();
        if (m.patient_id) {
          const p: any = m.patient_id;
          mObj.patient_name = p.name;
          mObj.patient_code = p.patient_code;
        }
        return mObj;
      }),
    },
    hardware: {
      total: devices.length,
      online: onlineDevices,
      offline: offlineDevices,
    },
    alerts: alerts.map((a) => a.toJSON()),
  });
}

export async function downloadCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { type = 'adherence' } = req.query;

  let csvContent = '';
  const now = new Date().toISOString().split('T')[0];

  switch (type) {
    case 'adherence': {
      csvContent = 'Patient Code,Patient Name,Date,Scheduled,Taken,Missed,Adherence Rate\n';
      const events = await MedicationEvent.find().populate('patient_id', 'name patient_code');
      const grouped: Record<string, { name: string; scheduled: number; taken: number; missed: number }> = {};

      for (const e of events) {
        const p: any = e.patient_id;
        const code = p?.patient_code || 'N/A';
        const name = p?.name || 'Unknown';
        if (!grouped[code]) {
          grouped[code] = { name, scheduled: 0, taken: 0, missed: 0 };
        }
        grouped[code].scheduled++;
        if (e.status === 'taken') grouped[code].taken++;
        if (e.status === 'missed') grouped[code].missed++;
      }

      for (const [code, data] of Object.entries(grouped)) {
        const rate = data.scheduled > 0 ? Math.round((data.taken / data.scheduled) * 100) : 100;
        csvContent += `"${code}","${data.name}","${now}",${data.scheduled},${data.taken},${data.missed},${rate}%\n`;
      }
      break;
    }

    case 'medication_history': {
      csvContent = 'Patient Code,Patient Name,Medication,Dosage,Scheduled Time,Taken At,Status,Meal Context\n';
      const events = await MedicationEvent.find()
        .populate('patient_id', 'name patient_code')
        .populate('medication_id', 'name dosage')
        .sort({ created_at: -1 });

      for (const e of events) {
        const p: any = e.patient_id;
        const m: any = e.medication_id;
        csvContent += `"${p?.patient_code || ''}","${p?.name || ''}","${m?.name || ''}","${m?.dosage || ''}","${e.scheduled_time}","${e.taken_at ? new Date(e.taken_at).toISOString() : ''}","${e.status}","${e.meal_context || ''}"\n`;
      }
      break;
    }

    case 'inventory': {
      csvContent = 'Medication Name,Medicine Type,Dosage,Patient,Current Stock,Threshold,Status\n';
      const meds = await Medication.find().populate('patient_id', 'name patient_code');
      for (const m of meds) {
        const p: any = m.patient_id;
        const isLow = m.current_quantity <= m.refill_threshold;
        csvContent += `"${m.name}","${m.medicine_type}","${m.dosage}","${p?.name || ''}",${m.current_quantity},${m.refill_threshold},"${isLow ? 'REFILL REQUIRED' : 'OPTIMAL'}"\n`;
      }
      break;
    }

    case 'alerts': {
      csvContent = 'Severity,Type,Title,Message,Status,Created At\n';
      const alerts = await Alert.find().sort({ created_at: -1 });
      for (const a of alerts) {
        csvContent += `"${a.severity}","${a.type}","${a.title}","${a.message}","${a.status}","${new Date(a.created_at).toISOString()}"\n`;
      }
      break;
    }

    default:
      res.status(400).send('Invalid export type specified.');
      return;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="mediserve_${type}_${now}.csv"`);
  res.send(csvContent);
}
