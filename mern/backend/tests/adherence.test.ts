import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { calculateAdherence } from '../src/services/adherence.service.js';
import { Patient } from '../src/models/Patient.js';
import { seedDatabase } from '../src/db/seed.js';
import { closeDB } from '../src/db/connection.js';

describe('MediServe MERN Adherence Calculation Engine', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await closeDB();
  });

  it('calculates today, weekly, and monthly adherence with disclaimer', async () => {
    const report = await calculateAdherence();

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

    // Healthcare regulatory compliance disclaimer
    expect(report.disclaimer).toContain('clinical diagnoses');
  });

  it('filters adherence by specific patient', async () => {
    const patient = await Patient.findOne();
    expect(patient).toBeDefined();

    const report = await calculateAdherence(patient!.id);
    expect(report.patientId).toBe(patient!.id);
    expect(report.today.scheduled).toBeGreaterThanOrEqual(0);
  });
});
