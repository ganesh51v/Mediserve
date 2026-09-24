import { describe, it, expect, beforeAll } from 'vitest';
import { calculateAdherence } from '../src/services/adherence.service.js';
import { getDatabase } from '../src/db/database.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Adherence Calculation Engine', () => {
  beforeAll(() => {
    seedDatabase();
  });

  it('calculates today, weekly, and monthly adherence with disclaimer', () => {
    const report = calculateAdherence();

    expect(report).toBeDefined();
    expect(report.today).toBeDefined();
    expect(typeof report.today.adherenceRate).toBe('number');
    expect(report.today.adherenceRate).toBeGreaterThanOrEqual(0);
    expect(report.today.adherenceRate).toBeLessThanOrEqual(100);

    // Weekly metrics
    expect(report.weekly).toBeDefined();
    expect(report.weekly.dailyTrend.length).toBe(7);
    expect(typeof report.weekly.adherenceRate).toBe('number');

    // Monthly metrics
    expect(report.monthly).toBeDefined();
    expect(report.monthly.weeklyTrend.length).toBe(4);

    // Disclaimer must be present for healthcare compliance
    expect(report.disclaimer).toContain('clinical diagnoses');
  });

  it('filters adherence by specific patient', () => {
    const db = getDatabase();
    const patient = db.prepare('SELECT id FROM patients LIMIT 1').get() as { id: string };

    const report = calculateAdherence(patient.id);
    expect(report.patientId).toBe(patient.id);
    expect(report.today.scheduled).toBeGreaterThanOrEqual(0);
  });
});
