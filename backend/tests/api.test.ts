import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { seedDatabase } from '../src/db/seed.js';

describe('MediServe Core API Endpoints', () => {
  beforeAll(() => {
    seedDatabase();
  });

  it('GET /api/health returns healthy system status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('POST /api/auth/login authenticates admin successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@mediserve.health', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
  });

  it('POST /api/auth/login authenticates doctor successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dr.smith@mediserve.health', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('doctor');
  });

  it('Blocks unauthorized access to protected patient routes', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  it('Allows device hardware heartbeat and status check', async () => {
    const res = await request(app)
      .post('/api/device/heartbeat')
      .send({ device_id: 'MED-DEV-101', battery_level: 95, signal_strength: 'strong' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
