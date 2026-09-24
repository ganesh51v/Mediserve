import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { AuditLog } from '../models/AuditLog.js';
import { config } from '../config/index.js';
import { AuthPayload, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email and password are required.' });
    return;
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

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
  await AuditLog.create({
    user_id: user._id,
    action: 'USER_LOGIN',
    entity_type: 'users',
    entity_id: user.id,
    details: `Role: ${user.role} logged in successfully`,
    ip_address: req.ip || '127.0.0.1',
  });

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

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated.' });
    return;
  }

  const user = await User.findById(req.user.userId).select('-password_hash');

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found.' });
    return;
  }

  res.json({ success: true, user: user.toJSON() });
}

export async function register(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { name, email, phone, password, role, specialization } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400).json({ success: false, error: 'Name, email, password, and role are required.' });
    return;
  }

  if (!['admin', 'doctor', 'caretaker'].includes(role)) {
    res.status(400).json({ success: false, error: 'Role must be admin, doctor, or caretaker.' });
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    res.status(409).json({ success: false, error: 'User with this email already exists.' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newUser = await User.create({
    name,
    email: email.toLowerCase().trim(),
    phone: phone || undefined,
    password_hash: passwordHash,
    role,
    specialization: specialization || undefined,
    status: 'active',
  });

  res.status(201).json({
    success: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      specialization: newUser.specialization,
      status: 'active',
    },
  });
}

export async function registerPatient(req: Request, res: Response): Promise<void> {
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

  const count = await Patient.countDocuments();
  let nextNum = 1001 + count;
  let patientCode = `P-${nextNum}`;

  while (await Patient.findOne({ patient_code: patientCode })) {
    nextNum += 1;
    patientCode = `P-${nextNum}`;
  }

  const patient = await Patient.create({
    patient_code: patientCode,
    name: name.trim(),
    date_of_birth,
    gender,
    phone: phone?.trim() || undefined,
    address: address?.trim() || undefined,
    emergency_contact: emergency_contact.trim(),
    emergency_phone: emergency_phone.trim(),
    blood_group: blood_group?.trim() || undefined,
    allergies: allergies?.trim() || undefined,
    medical_conditions: medical_conditions?.trim() || undefined,
    status: 'active',
  });

  await AuditLog.create({
    action: 'PATIENT_SELF_REGISTERED',
    entity_type: 'patients',
    entity_id: patient.id,
    details: `Patient self-registered: ${name.trim()} (${patientCode})`,
    ip_address: req.ip || '127.0.0.1',
  });

  res.status(201).json({
    success: true,
    patient: patient.toJSON(),
    message: 'Patient profile registered successfully.',
  });
}


export async function getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { role } = req.query;
  const filter: any = {};

  if (role) {
    filter.role = role;
  }

  const users = await User.find(filter).sort({ name: 1 }).select('-password_hash');
  res.json({ success: true, users: users.map((u) => u.toJSON()) });
}

export async function getSetupStatus(req: Request, res: Response): Promise<void> {
  const count = await User.countDocuments();
  res.json({ success: true, isSetup: count > 0, userCount: count });
}
