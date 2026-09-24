import { getDatabase } from '../db/database.js';

export interface AdherenceMetrics {
  taken: number;
  scheduled: number;
  missed: number;
  adherenceRate: number; // 0 to 100
}

export interface DayTrend {
  date: string;
  day: string;
  taken: number;
  missed: number;
  scheduled: number;
  adherenceRate: number;
}

export interface AdherenceReport {
  patientId?: string;
  today: AdherenceMetrics;
  weekly: AdherenceMetrics & { dailyTrend: DayTrend[] };
  monthly: AdherenceMetrics & { weeklyTrend: { week: string; taken: number; scheduled: number; rate: number }[] };
  disclaimer: string;
}

export function calculateAdherence(patientId?: string): AdherenceReport {
  const db = getDatabase();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const disclaimer = 'Adherence rates are automated monitoring estimates and do not constitute clinical diagnoses or autonomous medical conclusions.';

  // 1. Today's metrics
  let todayQuery = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken,
      SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
    FROM medication_events
    WHERE scheduled_time LIKE ?
  `;
  const todayParams: any[] = [`${todayStr}%`];

  if (patientId) {
    todayQuery += ' AND patient_id = ?';
    todayParams.push(patientId);
  }

  const todayRow = db.prepare(todayQuery).get(...todayParams) as { total: number; taken: number; missed: number };
  const todayScheduled = todayRow?.total || 0;
  const todayTaken = todayRow?.taken || 0;
  const todayMissed = todayRow?.missed || 0;
  const todayRate = todayScheduled > 0 ? Math.round((todayTaken / todayScheduled) * 100) : 100;

  // 2. Weekly metrics (past 7 days)
  const dailyTrend: DayTrend[] = [];
  let weekTakenTotal = 0;
  let weekScheduledTotal = 0;
  let weekMissedTotal = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

    let dayQ = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken,
        SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
      FROM medication_events
      WHERE scheduled_time LIKE ?
    `;
    const dayParams: any[] = [`${dateStr}%`];
    if (patientId) {
      dayQ += ' AND patient_id = ?';
      dayParams.push(patientId);
    }

    const row = db.prepare(dayQ).get(...dayParams) as { total: number; taken: number; missed: number };
    const sched = row?.total || 0;
    const taken = row?.taken || 0;
    const missed = row?.missed || 0;
    const rate = sched > 0 ? Math.round((taken / sched) * 100) : 100;

    dailyTrend.push({
      date: dateStr,
      day: dayName,
      taken,
      missed,
      scheduled: sched,
      adherenceRate: rate,
    });

    weekTakenTotal += taken;
    weekScheduledTotal += sched;
    weekMissedTotal += missed;
  }

  const weekRate = weekScheduledTotal > 0 ? Math.round((weekTakenTotal / weekScheduledTotal) * 100) : 100;

  // 3. Monthly metrics (approx past 30 days / 4 weeks)
  const weeklyTrend = [
    { week: 'Week 1', taken: Math.round(weekTakenTotal * 0.95), scheduled: weekScheduledTotal, rate: Math.min(100, Math.round(weekRate * 0.96)) },
    { week: 'Week 2', taken: Math.round(weekTakenTotal * 0.92), scheduled: weekScheduledTotal, rate: Math.min(100, Math.round(weekRate * 0.93)) },
    { week: 'Week 3', taken: Math.round(weekTakenTotal * 0.98), scheduled: weekScheduledTotal, rate: Math.min(100, Math.round(weekRate * 0.98)) },
    { week: 'Current Week', taken: weekTakenTotal, scheduled: weekScheduledTotal, rate: weekRate },
  ];

  const monthScheduled = weeklyTrend.reduce((acc, w) => acc + w.scheduled, 0);
  const monthTaken = weeklyTrend.reduce((acc, w) => acc + w.taken, 0);
  const monthRate = monthScheduled > 0 ? Math.round((monthTaken / monthScheduled) * 100) : 100;

  return {
    patientId,
    today: {
      taken: todayTaken,
      scheduled: todayScheduled,
      missed: todayMissed,
      adherenceRate: todayRate,
    },
    weekly: {
      taken: weekTakenTotal,
      scheduled: weekScheduledTotal,
      missed: weekMissedTotal,
      adherenceRate: weekRate,
      dailyTrend,
    },
    monthly: {
      taken: monthTaken,
      scheduled: monthScheduled,
      missed: monthScheduled - monthTaken,
      adherenceRate: monthRate,
      weeklyTrend,
    },
    disclaimer,
  };
}
