import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database.js';
import { config } from '../config/index.js';
import { AuthPayload, User } from '../models/types.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export function login(req: Request, res: Response): void {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email and password are required.' });
    return;
  }

  const db = getDatabase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as User | undefined;

  if (!user || !user.password_hash) {
    res.status(401).json({ success: false, error: 'Invalid medical credentials.' });
    return;
  }

  if (user.status !== 'active') {
    res.status(403).json({ success: false, error: 'Account is inactive. Please contact your system administrator.' });
    return;
  }

  const passwordValid = bcrypt.compareSync(password, user.password_hash);
  if (!passwordValid) {
    res.status(401).json({ success: false, error: 'Invalid medical credentials.' });
    return;
  }

  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });

  // Log successful login to audit
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (?, ?, 'USER_LOGIN', 'users', ?, ?, ?, ?)
  `).run(
    uuidv4(),
    user.id,
    user.id,
    `Role: ${user.role} logged in successfully`,
    req.ip || '127.0.0.1',
    new Date().toISOString()
  );

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      specialization: user.specialization,
      status: user.status,
    },
  });
}

export function getMe(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated.' });
    return;
  }

  const db = getDatabase();
  const user = db.prepare('SELECT id, name, email, phone, role, status, specialization, created_at FROM users WHERE id = ?').get(req.user.userId);

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found.' });
    return;
  }

  res.json({ success: true, user });
}

export function register(req: AuthenticatedRequest, res: Response): void {
  const { name, email, phone, password, role, specialization } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400).json({ success: false, error: 'Name, email, password, and role are required.' });
    return;
  }

  if (!['admin', 'doctor', 'caretaker'].includes(role)) {
    res.status(400).json({ success: false, error: 'Role must be admin, doctor, or caretaker.' });
    return;
  }

  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    res.status(409).json({ success: false, error: 'User with this email already exists.' });
    return;
  }

  const id = uuidv4();
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, name, email, phone, password_hash, role, status, specialization, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
  `).run(id, name, email.toLowerCase().trim(), phone || null, passwordHash, role, specialization || null, now, now);

  res.status(201).json({
    success: true,
    user: { id, name, email: email.toLowerCase().trim(), phone, role, specialization, status: 'active' },
  });
}

export function registerPatient(req: Request, res: Response): void {
  const {
    name,
    date_of_birth,
    gender,
    phone,
    address,
    emergency_contact,
    emergency_phone,
    blood_group,
    allergies,
    medical_conditions,
  } = req.body;

  if (!name || !date_of_birth || !gender || !emergency_contact || !emergency_phone) {
    res.status(400).json({
      success: false,
      error: 'Name, date of birth, gender, emergency contact, and emergency phone are required.',
    });
    return;
  }

  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  // Auto-generate next patient code e.g. P-1001, P-1002
  const countRow = db.prepare('SELECT COUNT(*) as count FROM patients').get() as { count: number };
  let nextNum = 1001 + countRow.count;
  let patientCode = `P-${nextNum}`;

  while (db.prepare('SELECT id FROM patients WHERE patient_code = ?').get(patientCode)) {
    nextNum += 1;
    patientCode = `P-${nextNum}`;
  }

  db.prepare(`
    INSERT INTO patients (
      id, patient_code, name, date_of_birth, gender, phone, address,
      emergency_contact, emergency_phone, blood_group, allergies,
      medical_conditions, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(
    id,
    patientCode,
    name.trim(),
    date_of_birth,
    gender,
    phone?.trim() || null,
    address?.trim() || null,
    emergency_contact.trim(),
    emergency_phone.trim(),
    blood_group?.trim() || null,
    allergies?.trim() || null,
    medical_conditions?.trim() || null,
    now,
    now
  );

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (?, ?, 'PATIENT_SELF_REGISTERED', 'patients', ?, ?, ?, ?)
  `).run(
    uuidv4(),
    null,
    id,
    `Patient self-registered: ${name.trim()} (${patientCode})`,
    req.ip || '127.0.0.1',
    now
  );

  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);

  res.status(201).json({
    success: true,
    patient,
    message: 'Patient profile registered successfully.',
  });
}


export function getUsers(req: AuthenticatedRequest, res: Response): void {
  const { role } = req.query;
  const db = getDatabase();

  let query = 'SELECT id, name, email, phone, role, status, specialization, created_at FROM users';
  const params: any[] = [];

  if (role) {
    query += ' WHERE role = ?';
    params.push(role);
  }

  query += ' ORDER BY name ASC';
  const users = db.prepare(query).all(...params);

  res.json({ success: true, users });
}

export function getSetupStatus(req: Request, res: Response): void {
  const db = getDatabase();
  const count = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  res.json({ success: true, isSetup: count > 0, userCount: count });
}
