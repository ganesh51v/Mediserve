import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { connectDB, closeDB } from './connection.js';
import {
  User,
  Patient,
  Device,
  Medication,
  MedicationSchedule,
  MedicationEvent,
  Alert,
  HealthRecord,
  AuditLog,
} from '../models/index.js';

export async function seedDatabase(): Promise<void> {
  await connectDB();
  console.log('🌱 Seeding MongoDB dataset for MediServe...');

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Patient.deleteMany({}),
    Device.deleteMany({}),
    Medication.deleteMany({}),
    MedicationSchedule.deleteMany({}),
    MedicationEvent.deleteMany({}),
    Alert.deleteMany({}),
    HealthRecord.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('Password123!', salt);

  // 1. Users
  const [admin, drSmith, drPatel, sarah, david, elena] = await User.create([
    {
      name: 'MediServe Administrator',
      email: 'admin@mediserve.health',
      phone: '+1 555-0100',
      password_hash: passwordHash,
      role: 'admin',
      status: 'active',
      specialization: 'System Operations',
    },
    {
      name: 'Dr. Robert Smith, MD',
      email: 'dr.smith@mediserve.health',
      phone: '+1 555-0101',
      password_hash: passwordHash,
      role: 'doctor',
      status: 'active',
      specialization: 'Cardiology & Internal Medicine',
    },
    {
      name: 'Dr. Anita Patel, MD',
      email: 'dr.patel@mediserve.health',
      phone: '+1 555-0102',
      password_hash: passwordHash,
      role: 'doctor',
      status: 'active',
      specialization: 'Geriatric Medicine',
    },
    {
      name: 'Sarah Jenkins, RN',
      email: 'sarah.caretaker@mediserve.health',
      phone: '+1 555-0201',
      password_hash: passwordHash,
      role: 'caretaker',
      status: 'active',
      specialization: 'Lead Nurse & Home Caretaker',
    },
    {
      name: 'David Miller',
      email: 'david.caretaker@mediserve.health',
      phone: '+1 555-0202',
      password_hash: passwordHash,
      role: 'caretaker',
      status: 'active',
      specialization: 'Certified Care Specialist',
    },
    {
      name: 'Elena Rostova',
      email: 'elena.caretaker@mediserve.health',
      phone: '+1 555-0203',
      password_hash: passwordHash,
      role: 'caretaker',
      status: 'active',
      specialization: 'Elderly Care Assistant',
    },
  ]);

  // 2. Patients
  const patientDocs = await Patient.create([
    {
      patient_code: 'P-1001',
      name: 'Robert Chen',
      date_of_birth: '1958-04-12',
      gender: 'Male',
      phone: '+1 555-4001',
      address: '742 Evergreen Terr, Springfield',
      emergency_contact: 'Grace Chen (Daughter)',
      emergency_phone: '+1 555-9001',
      blood_group: 'O+',
      allergies: 'Penicillin, Sulfa drugs',
      medical_conditions: 'Hypertension, Type 2 Diabetes, Mild Memory Loss',
      doctor_id: drSmith._id,
      caretaker_id: sarah._id,
      status: 'active',
    },
    {
      patient_code: 'P-1002',
      name: 'Margaret Taylor',
      date_of_birth: '1947-09-23',
      gender: 'Female',
      phone: '+1 555-4002',
      address: '108 Oak Street, Springfield',
      emergency_contact: 'Thomas Taylor (Son)',
      emergency_phone: '+1 555-9002',
      blood_group: 'A+',
      allergies: 'Aspirin, Ibuprofen',
      medical_conditions: 'Osteoarthritis, Chronic Kidney Disease Stage 2',
      doctor_id: drPatel._id,
      caretaker_id: david._id,
      status: 'active',
    },
    {
      patient_code: 'P-1003',
      name: 'James Wilson',
      date_of_birth: '1952-11-05',
      gender: 'Male',
      phone: '+1 555-4003',
      address: '45 Elm Court, Springfield',
      emergency_contact: 'Patricia Wilson (Wife)',
      emergency_phone: '+1 555-9003',
      blood_group: 'B+',
      allergies: 'None',
      medical_conditions: 'Coronary Artery Disease, Hyperlipidemia',
      doctor_id: drSmith._id,
      caretaker_id: sarah._id,
      status: 'active',
    },
    {
      patient_code: 'P-1004',
      name: 'Eleanor Davis',
      date_of_birth: '1963-02-18',
      gender: 'Female',
      phone: '+1 555-4004',
      address: '89 Maple Ave, Springfield',
      emergency_contact: 'Mark Davis (Husband)',
      emergency_phone: '+1 555-9004',
      blood_group: 'AB-',
      allergies: 'Codeine',
      medical_conditions: 'Hypothyroidism, Rheumatoid Arthritis',
      doctor_id: drPatel._id,
      caretaker_id: elena._id,
      status: 'active',
    },
    {
      patient_code: 'P-1005',
      name: 'Arthur Pendelton',
      date_of_birth: '1943-07-30',
      gender: 'Male',
      phone: '+1 555-4005',
      address: '312 Pine Ridge, Springfield',
      emergency_contact: 'Susan Pendelton (Daughter-in-law)',
      emergency_phone: '+1 555-9005',
      blood_group: 'O-',
      allergies: 'Latex, Iodine',
      medical_conditions: 'Parkinson Disease, Stage 1 Dementia',
      doctor_id: drPatel._id,
      caretaker_id: sarah._id,
      status: 'active',
    },
  ]);

  // 3. Medications & Schedules
  for (const p of patientDocs) {
    const med1 = await Medication.create({
      patient_id: p._id,
      doctor_id: p.doctor_id,
      name: p.patient_code === 'P-1001' ? 'Lisinopril' : 'Metformin',
      medicine_type: 'Tablet',
      dosage: p.patient_code === 'P-1001' ? '10mg' : '500mg',
      current_quantity: 28,
      initial_quantity: 30,
      refill_threshold: 7,
      frequency: 'Once daily',
      meal_relation: 'After Breakfast',
      scheduled_time: '08:00',
      start_date: todayStr,
      instructions: 'Take with full glass of water after breakfast',
      status: 'active',
    });

    const sched1 = await MedicationSchedule.create({
      medication_id: med1._id,
      patient_id: p._id,
      scheduled_time: '08:00',
      meal_relation: 'After Breakfast',
      days_of_week: 'Daily',
      active: true,
    });

    await MedicationEvent.create({
      patient_id: p._id,
      medication_id: med1._id,
      schedule_id: sched1._id,
      scheduled_time: '08:00',
      status: 'pending',
    });

    const med2 = await Medication.create({
      patient_id: p._id,
      doctor_id: p.doctor_id,
      name: 'Atorvastatin',
      medicine_type: 'Tablet',
      dosage: '20mg',
      current_quantity: 15,
      initial_quantity: 30,
      refill_threshold: 5,
      frequency: 'Once daily',
      meal_relation: 'After Dinner',
      scheduled_time: '20:00',
      start_date: todayStr,
      instructions: 'Take after dinner',
      status: 'active',
    });

    const sched2 = await MedicationSchedule.create({
      medication_id: med2._id,
      patient_id: p._id,
      scheduled_time: '20:00',
      meal_relation: 'After Dinner',
      days_of_week: 'Daily',
      active: true,
    });

    await MedicationEvent.create({
      patient_id: p._id,
      medication_id: med2._id,
      schedule_id: sched2._id,
      scheduled_time: '20:00',
      status: 'pending',
    });

    // 4. Device per patient
    await Device.create({
      device_id: `MED-DEV-${p.patient_code.split('-')[1]}`,
      patient_id: p._id,
      status: 'online',
      battery_level: 92,
      signal_strength: 'strong',
      firmware_version: 'v2.4.1',
      last_seen: new Date(),
      compartments: [
        { compartment: 1, medication_id: med1._id, medication_name: med1.name, capacity: 30, pills_remaining: 28 },
        { compartment: 2, medication_id: med2._id, medication_name: med2.name, capacity: 30, pills_remaining: 15 },
        { compartment: 3, capacity: 30, pills_remaining: 0 },
        { compartment: 4, capacity: 30, pills_remaining: 0 },
        { compartment: 5, capacity: 30, pills_remaining: 0 },
        { compartment: 6, capacity: 30, pills_remaining: 0 },
      ],
      dispensing_status: 'idle',
      device_token: uuidv4(),
    });

    // 5. Health Record per patient
    await HealthRecord.create({
      patient_id: p._id,
      recorded_by: drSmith._id,
      blood_pressure_sys: 122,
      blood_pressure_dia: 82,
      heart_rate: 74,
      blood_glucose: 104,
      temperature: 98.6,
      oxygen_saturation: 98,
      notes: 'Stable vital signs during clinical intake check.',
      recorded_at: new Date(),
    });
  }

  // 6. Alerts
  await Alert.create([
    {
      patient_id: patientDocs[0]._id,
      type: 'medication_missed',
      severity: 'high',
      title: 'Missed Dose Warning',
      message: 'Robert Chen did not confirm Lisinopril morning dosage within scheduled 30m window.',
      status: 'unread',
    },
    {
      patient_id: patientDocs[1]._id,
      type: 'refill_required',
      severity: 'medium',
      title: 'Inventory Threshold Reached',
      message: 'Prescription Metformin 500mg has reached the 7-pill refill alert safety buffer.',
      status: 'unread',
    },
  ]);

  // 7. Audit Log
  await AuditLog.create({
    user_id: admin._id,
    action: 'SYSTEM_SEED',
    entity_type: 'database',
    entity_id: 'all',
    details: 'Initial MERN dataset seeded for clinical demo.',
    ip_address: '127.0.0.1',
  });

  console.log(`✅ Seeded ${patientDocs.length} patients, ${await Device.countDocuments()} devices, and clinical prescriptions in MongoDB.`);
}

if (process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(() => closeDB())
    .catch((err) => {
      console.error('Error during database seeding:', err);
      process.exit(1);
    });
}
