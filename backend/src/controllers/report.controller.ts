import { Response } from 'express';
import { getDatabase } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { calculateAdherence } from '../services/adherence.service.js';

export function getReportsSummary(req: AuthenticatedRequest, res: Response): void {
  const db = getDatabase();
  const { startDate, endDate, patientId } = req.query;

  // General KPIs
  const overallAdherence = calculateAdherence(patientId as string | undefined);

  // Missed doses in range
  let missedQuery = `
    SELECT e.*, p.name as patient_name, p.patient_code, m.name as medication_name, m.dosage
    FROM medication_events e
    JOIN patients p ON e.patient_id = p.id
    JOIN medications m ON e.medication_id = m.id
    WHERE e.status = 'missed'
  `;
  const missedParams: any[] = [];

  if (patientId) {
    missedQuery += ' AND e.patient_id = ?';
    missedParams.push(patientId);
  }

  if (startDate) {
    missedQuery += ' AND e.scheduled_time >= ?';
    missedParams.push(startDate);
  }

  if (endDate) {
    missedQuery += ' AND e.scheduled_time <= ?';
    missedParams.push(endDate);
  }

  missedQuery += ' ORDER BY e.scheduled_time DESC LIMIT 50';
  const missedDoses = db.prepare(missedQuery).all(...missedParams);

  // Inventory status
  const inventory = db.prepare(`
    SELECT m.*, p.name as patient_name, p.patient_code
    FROM medications m
    JOIN patients p ON m.patient_id = p.id
    ORDER BY m.current_quantity ASC
  `).all();

  // Device status summary
  const devices = db.prepare(`
    SELECT d.*, p.name as patient_name
    FROM devices d
    LEFT JOIN patients p ON d.patient_id = p.id
    ORDER BY d.status DESC
  `).all();

  res.json({
    success: true,
    adherence: overallAdherence,
    missedDoses,
    inventory,
    devices,
  });
}

export function exportCsvReport(req: AuthenticatedRequest, res: Response): void {
  const { type = 'adherence', patientId } = req.query;
  const db = getDatabase();

  let filename = `mediserve_${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
  let csvContent = '';

  if (type === 'adherence' || type === 'medication_history') {
    let query = `
      SELECT 
        e.scheduled_time,
        p.patient_code,
        p.name as patient_name,
        m.name as medication_name,
        m.dosage,
        e.status,
        COALESCE(e.dispensed_at, 'N/A') as dispensed_at,
        COALESCE(e.taken_at, 'N/A') as taken_at,
        COALESCE(e.meal_context, 'Standard') as meal_context
      FROM medication_events e
      JOIN patients p ON e.patient_id = p.id
      JOIN medications m ON e.medication_id = m.id
    `;
    const params: any[] = [];
    if (patientId) {
      query += ' WHERE e.patient_id = ?';
      params.push(patientId);
    }
    query += ' ORDER BY e.scheduled_time DESC LIMIT 500';

    const rows = db.prepare(query).all(...params) as any[];
    csvContent = 'Scheduled Time,Patient Code,Patient Name,Medication,Dosage,Status,Dispensed At,Taken At,Meal Relation\n';
    rows.forEach((r) => {
      csvContent += `"${r.scheduled_time}","${r.patient_code}","${r.patient_name}","${r.medication_name}","${r.dosage}","${r.status}","${r.dispensed_at}","${r.taken_at}","${r.meal_context}"\n`;
    });
  } else if (type === 'inventory') {
    const rows = db.prepare(`
      SELECT 
        p.patient_code,
        p.name as patient_name,
        m.name as medication_name,
        m.dosage,
        m.current_quantity,
        m.refill_threshold,
        m.frequency,
        m.meal_relation,
        CASE WHEN m.current_quantity <= m.refill_threshold THEN 'YES' ELSE 'NO' END as refill_needed
      FROM medications m
      JOIN patients p ON m.patient_id = p.id
      ORDER BY m.current_quantity ASC
    `).all() as any[];

    csvContent = 'Patient Code,Patient Name,Medication,Dosage,Current Stock,Threshold,Frequency,Meal Relation,Refill Alert\n';
    rows.forEach((r) => {
      csvContent += `"${r.patient_code}","${r.patient_name}","${r.medication_name}","${r.dosage}",${r.current_quantity},${r.refill_threshold},"${r.frequency}","${r.meal_relation}","${r.refill_needed}"\n`;
    });
  } else if (type === 'alerts') {
    const rows = db.prepare(`
      SELECT 
        a.created_at,
        p.patient_code,
        p.name as patient_name,
        a.type,
        a.severity,
        a.title,
        a.message,
        a.status,
        COALESCE(a.acknowledged_at, 'N/A') as acknowledged_at
      FROM alerts a
      LEFT JOIN patients p ON a.patient_id = p.id
      ORDER BY a.created_at DESC
    `).all() as any[];

    csvContent = 'Created At,Patient Code,Patient Name,Type,Severity,Title,Message,Status,Acknowledged At\n';
    rows.forEach((r) => {
      csvContent += `"${r.created_at}","${r.patient_code || 'N/A'}","${r.patient_name || 'System'}","${r.type}","${r.severity}","${r.title}","${r.message.replace(/"/g, '""')}","${r.status}","${r.acknowledged_at}"\n`;
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
}
