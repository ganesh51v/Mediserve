import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, closeDatabase } from './database.js';

export function seedDatabase() {
  const db = getDatabase();

  console.log('🌱 Seeding database...');

  // Clear existing data in reverse dependency order
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM health_records;
    DELETE FROM alerts;
    DELETE FROM medication_events;
    DELETE FROM medication_schedules;
    DELETE FROM medications;
    DELETE FROM devices;
    DELETE FROM patients;
    DELETE FROM users;
  `);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('Password123!', salt);

  // 1. Users
  const adminId = uuidv4();
  const drSmithId = uuidv4();
  const drPatelId = uuidv4();
  const sarahId = uuidv4();
  const davidId = uuidv4();
  const elenaId = uuidv4();

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, phone, password_hash, role, status, specialization, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(adminId, 'MediServe Administrator', 'admin@mediserve.health', '+1 555-0100', passwordHash, 'admin', 'active', 'System Operations', now.toISOString(), now.toISOString());
  insertUser.run(drSmithId, 'Dr. Robert Smith, MD', 'dr.smith@mediserve.health', '+1 555-0101', passwordHash, 'doctor', 'active', 'Cardiology & Internal Medicine', now.toISOString(), now.toISOString());
  insertUser.run(drPatelId, 'Dr. Anita Patel, MD', 'dr.patel@mediserve.health', '+1 555-0102', passwordHash, 'doctor', 'active', 'Geriatric Medicine', now.toISOString(), now.toISOString());
  insertUser.run(sarahId, 'Sarah Jenkins, RN', 'sarah.caretaker@mediserve.health', '+1 555-0201', passwordHash, 'caretaker', 'active', 'Lead Nurse & Home Caretaker', now.toISOString(), now.toISOString());
  insertUser.run(davidId, 'David Miller', 'david.caretaker@mediserve.health', '+1 555-0202', passwordHash, 'caretaker', 'active', 'Certified Care Specialist', now.toISOString(), now.toISOString());
  insertUser.run(elenaId, 'Elena Rostova', 'elena.caretaker@mediserve.health', '+1 555-0203', passwordHash, 'caretaker', 'active', 'Elderly Care Assistant', now.toISOString(), now.toISOString());

  // 2. Patients (8 Patients)
  const patientData = [
    {
      id: uuidv4(),
      code: 'P-1001',
      name: 'Robert Chen',
      dob: '1958-04-12',
      gender: 'Male',
      phone: '+1 555-4001',
      address: '742 Evergreen Terr, Springfield',
      emergency: 'Grace Chen (Daughter)',
      emergencyPhone: '+1 555-9001',
      blood: 'O+',
      allergies: 'Penicillin, Latex',
      conditions: 'Hypertension, Type 2 Diabetes',
      doctorId: drSmithId,
      caretakerId: sarahId,
    },
    {
      id: uuidv4(),
      code: 'P-1002',
      name: 'Eleanor Vance',
      dob: '1952-11-23',
      gender: 'Female',
      phone: '+1 555-4002',
      address: '104 Hillcrest Way, Oakville',
      emergency: 'Marcus Vance (Son)',
      emergencyPhone: '+1 555-9002',
      blood: 'A+',
      allergies: 'Sulfa Drugs',
      conditions: 'Osteoarthritis, Mild Cognitive Impairment',
      doctorId: drPatelId,
      caretakerId: sarahId,
    },
    {
      id: uuidv4(),
      code: 'P-1003',
      name: 'James Wilson',
      dob: '1955-08-19',
      gender: 'Male',
      phone: '+1 555-4003',
      address: '22 Baker St, Lakeview',
      emergency: 'Patricia Wilson (Wife)',
      emergencyPhone: '+1 555-9003',
      blood: 'B+',
      allergies: 'None known',
      conditions: 'Post-Stroke Hemiparesis, Atrial Fibrillation',
      doctorId: drSmithId,
      caretakerId: davidId,
    },
    {
      id: uuidv4(),
      code: 'P-1004',
      name: 'Margaret Taylor',
      dob: '1947-02-14',
      gender: 'Female',
      phone: '+1 555-4004',
      address: '88 Rosewood Dr, Sunnyvale',
      emergency: 'Emily Taylor (Granddaughter)',
      emergencyPhone: '+1 555-9004',
      blood: 'AB+',
      allergies: 'Aspirin, Ibuprofen',
      conditions: 'Congestive Heart Failure, Edema',
      doctorId: drSmithId,
      caretakerId: davidId,
    },
    {
      id: uuidv4(),
      code: 'P-1005',
      name: 'Samuel Green',
      dob: '1961-09-30',
      gender: 'Male',
      phone: '+1 555-4005',
      address: '450 Pinecrest Ave, Riverdale',
      emergency: 'Jonathan Green (Brother)',
      emergencyPhone: '+1 555-9005',
      blood: 'O-',
      allergies: 'Shellfish',
      conditions: 'Parkinson\'s Disease, Essential Tremor',
      doctorId: drPatelId,
      caretakerId: elenaId,
    },
    {
      id: uuidv4(),
      code: 'P-1006',
      name: 'Clara Rodriguez',
      dob: '1964-06-05',
      gender: 'Female',
      phone: '+1 555-4006',
      address: '312 Maple Blvd, Greenfield',
      emergency: 'Carlos Rodriguez (Husband)',
      emergencyPhone: '+1 555-9006',
      blood: 'B-',
      allergies: 'Codeine',
      conditions: 'COPD, Chronic Asthma',
      doctorId: drPatelId,
      caretakerId: elenaId,
    },
    {
      id: uuidv4(),
      code: 'P-1007',
      name: 'Arthur Pendelton',
      dob: '1944-01-18',
      gender: 'Male',
      phone: '+1 555-4007',
      address: '900 Harbor View, Bayport',
      emergency: 'Linda Pendelton (Daughter)',
      emergencyPhone: '+1 555-9007',
      blood: 'A-',
      allergies: 'None known',
      conditions: 'Cardiac Arrhythmia, Hyperlipidemia',
      doctorId: drSmithId,
      caretakerId: sarahId,
    },
    {
      id: uuidv4(),
      code: 'P-1008',
      name: 'Beatrice Foster',
      dob: '1950-12-08',
      gender: 'Female',
      phone: '+1 555-4008',
      address: '517 Cedar Lane, Westwood',
      emergency: 'Timothy Foster (Son)',
      emergencyPhone: '+1 555-9008',
      blood: 'O+',
      allergies: 'NSAIDs, Contrast Dye',
      conditions: 'Stage 3 Chronic Kidney Disease, Hypertension',
      doctorId: drPatelId,
      caretakerId: davidId,
    },
  ];

  const insertPatient = db.prepare(`
    INSERT INTO patients (id, patient_code, name, date_of_birth, gender, phone, address, emergency_contact, emergency_phone, blood_group, allergies, medical_conditions, doctor_id, caretaker_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  patientData.forEach((p) => {
    insertPatient.run(
      p.id,
      p.code,
      p.name,
      p.dob,
      p.gender,
      p.phone,
      p.address,
      p.emergency,
      p.emergencyPhone,
      p.blood,
      p.allergies,
      p.conditions,
      p.doctorId,
      p.caretakerId,
      'active',
      now.toISOString(),
      now.toISOString()
    );
  });

  // 3. Devices (8 devices linked to each patient)
  const deviceData = [
    { id: uuidv4(), code: 'MED-DEV-101', patientId: patientData[0].id, status: 'online', battery: 94, signal: 'strong', fw: 'v2.4.1', err: null },
    { id: uuidv4(), code: 'MED-DEV-102', patientId: patientData[1].id, status: 'online', battery: 88, signal: 'strong', fw: 'v2.4.1', err: null },
    { id: uuidv4(), code: 'MED-DEV-103', patientId: patientData[2].id, status: 'warning', battery: 18, signal: 'moderate', fw: 'v2.4.0', err: 'Low battery level warning' },
    { id: uuidv4(), code: 'MED-DEV-104', patientId: patientData[3].id, status: 'offline', battery: 0, signal: 'none', fw: 'v2.3.9', err: 'Device unreachable since 04:30 AM' },
    { id: uuidv4(), code: 'MED-DEV-105', patientId: patientData[4].id, status: 'online', battery: 92, signal: 'strong', fw: 'v2.4.1', err: null },
    { id: uuidv4(), code: 'MED-DEV-106', patientId: patientData[5].id, status: 'online', battery: 85, signal: 'moderate', fw: 'v2.4.1', err: null },
    { id: uuidv4(), code: 'MED-DEV-107', patientId: patientData[6].id, status: 'online', battery: 79, signal: 'strong', fw: 'v2.4.1', err: null },
    { id: uuidv4(), code: 'MED-DEV-108', patientId: patientData[7].id, status: 'online', battery: 90, signal: 'strong', fw: 'v2.4.1', err: null },
  ];

  const insertDevice = db.prepare(`
    INSERT INTO devices (id, device_id, patient_id, status, battery_level, signal_strength, firmware_version, last_seen, compartments_json, dispensing_status, error_message, device_token, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  deviceData.forEach((d) => {
    const compartments = [
      { compartment: 1, capacity: 30, pills_remaining: 24 },
      { compartment: 2, capacity: 30, pills_remaining: 18 },
      { compartment: 3, capacity: 30, pills_remaining: 12 },
      { compartment: 4, capacity: 30, pills_remaining: 28 },
      { compartment: 5, capacity: 30, pills_remaining: 30 },
      { compartment: 6, capacity: 30, pills_remaining: 0 },
    ];

    insertDevice.run(
      d.id,
      d.code,
      d.patientId,
      d.status,
      d.battery,
      d.signal,
      d.fw,
      now.toISOString(),
      JSON.stringify(compartments),
      'idle',
      d.err,
      `token_${d.code.toLowerCase()}_sec`,
      now.toISOString(),
      now.toISOString()
    );
  });

  // 4. Medications & Schedules
  const insertMedication = db.prepare(`
    INSERT INTO medications (id, patient_id, doctor_id, name, medicine_type, dosage, current_quantity, initial_quantity, refill_threshold, frequency, meal_relation, scheduled_time, start_date, end_date, instructions, special_precautions, storage_info, expiry_date, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSchedule = db.prepare(`
    INSERT INTO medication_schedules (id, medication_id, patient_id, scheduled_time, meal_relation, days_of_week, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertEvent = db.prepare(`
    INSERT INTO medication_events (id, patient_id, medication_id, schedule_id, device_id, scheduled_time, dispensed_at, taken_at, status, meal_context, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Prescriptions definition
  const prescriptions = [
    // Robert Chen (P-1001)
    {
      patientIndex: 0,
      name: 'Lisinopril',
      type: 'Tablet',
      dosage: '10mg',
      currentQty: 24,
      initialQty: 30,
      refillThreshold: 5,
      frequency: 'Once daily',
      mealRelation: 'After Breakfast',
      time: '08:30',
      instructions: 'Take 1 tablet with a full glass of water after finishing breakfast.',
      precautions: 'Monitor blood pressure regularly. Avoid potassium supplements.',
      todayStatus: 'taken',
      takenAt: `${todayStr}T08:35:00Z`,
      dispensedAt: `${todayStr}T08:31:00Z`,
    },
    {
      patientIndex: 0,
      name: 'Metformin',
      type: 'Tablet',
      dosage: '500mg',
      currentQty: 48,
      initialQty: 60,
      refillThreshold: 10,
      frequency: 'Twice daily',
      mealRelation: 'With Meal',
      time: '13:00',
      instructions: 'Take with lunch to avoid gastrointestinal upset.',
      precautions: 'Stay well hydrated. Report persistent stomach pain.',
      todayStatus: 'pending',
      takenAt: null,
      dispensedAt: null,
    },
    {
      patientIndex: 0,
      name: 'Atorvastatin',
      type: 'Tablet',
      dosage: '20mg',
      currentQty: 21,
      initialQty: 30,
      refillThreshold: 5,
      frequency: 'Once daily',
      mealRelation: 'After Dinner',
      time: '20:30',
      instructions: 'Take 1 tablet in the evening after dinner.',
      precautions: 'Avoid grapefruit juice.',
      todayStatus: 'pending',
      takenAt: null,
      dispensedAt: null,
    },

    // Eleanor Vance (P-1002)
    {
      patientIndex: 1,
      name: 'Donepezil',
      type: 'Tablet',
      dosage: '10mg',
      currentQty: 18,
      initialQty: 30,
      refillThreshold: 7,
      frequency: 'Once daily',
      mealRelation: 'Before Dinner',
      time: '18:30',
      instructions: 'Take directly before the evening meal.',
      precautions: 'Observe for gastrointestinal disturbances or unusual fatigue.',
      todayStatus: 'pending',
      takenAt: null,
      dispensedAt: null,
    },
    {
      patientIndex: 1,
      name: 'Celecoxib',
      type: 'Capsule',
      dosage: '200mg',
      currentQty: 26,
      initialQty: 30,
      refillThreshold: 5,
      frequency: 'Once daily',
      mealRelation: 'After Breakfast',
      time: '09:00',
      instructions: 'Take after breakfast with food.',
      precautions: 'Report any black or tarry stools immediately.',
      todayStatus: 'missed',
      takenAt: null,
      dispensedAt: `${todayStr}T09:01:00Z`,
    },

    // James Wilson (P-1003)
    {
      patientIndex: 2,
      name: 'Clopidogrel',
      type: 'Tablet',
      dosage: '75mg',
      currentQty: 15,
      initialQty: 30,
      refillThreshold: 5,
      frequency: 'Once daily',
      mealRelation: 'After Breakfast',
      time: '08:00',
      instructions: 'Swallow whole with water.',
      precautions: 'High risk of bruising and bleeding. Monitor carefully.',
      todayStatus: 'taken',
      takenAt: `${todayStr}T08:08:00Z`,
      dispensedAt: `${todayStr}T08:02:00Z`,
    },

    // Margaret Taylor (P-1004) - LOW INVENTORY REFILL REQUIRED!
    {
      patientIndex: 3,
      name: 'Furosemide',
      type: 'Tablet',
      dosage: '40mg',
      currentQty: 3, // Below threshold 7!
      initialQty: 30,
      refillThreshold: 7,
      frequency: 'Once daily',
      mealRelation: 'Empty Stomach',
      time: '07:30',
      instructions: 'Take early morning on an empty stomach to prevent nocturnal urination.',
      precautions: 'Electrolyte monitoring required. Stand up slowly to avoid dizziness.',
      todayStatus: 'missed',
      takenAt: null,
      dispensedAt: null,
    },
    {
      patientIndex: 3,
      name: 'Carvedilol',
      type: 'Tablet',
      dosage: '12.5mg',
      currentQty: 20,
      initialQty: 60,
      refillThreshold: 10,
      frequency: 'Twice daily',
      mealRelation: 'With Meal',
      time: '08:00',
      instructions: 'Take with food to minimize hypotension risk.',
      precautions: 'Check pulse before taking; do not take if heart rate < 55 bpm.',
      todayStatus: 'missed',
      takenAt: null,
      dispensedAt: null,
    },

    // Samuel Green (P-1005)
    {
      patientIndex: 4,
      name: 'Carbidopa-Levodopa',
      type: 'Tablet',
      dosage: '25/100mg',
      currentQty: 54,
      initialQty: 90,
      refillThreshold: 15,
      frequency: 'Three times daily',
      mealRelation: 'Before Breakfast',
      time: '07:30',
      instructions: 'Take 30 minutes before breakfast. Avoid high protein meals simultaneously.',
      precautions: 'Timing consistency is critical for motor symptom management.',
      todayStatus: 'taken',
      takenAt: `${todayStr}T07:34:00Z`,
      dispensedAt: `${todayStr}T07:30:00Z`,
    },

    // Clara Rodriguez (P-1006)
    {
      patientIndex: 5,
      name: 'Theophylline',
      type: 'Tablet',
      dosage: '200mg',
      currentQty: 22,
      initialQty: 30,
      refillThreshold: 6,
      frequency: 'Once daily',
      mealRelation: 'After Breakfast',
      time: '08:30',
      instructions: 'Take after morning meal with water.',
      precautions: 'Avoid excess caffeine consumption.',
      todayStatus: 'taken',
      takenAt: `${todayStr}T08:42:00Z`,
      dispensedAt: `${todayStr}T08:31:00Z`,
    },

    // Arthur Pendelton (P-1007)
    {
      patientIndex: 6,
      name: 'Amiodarone',
      type: 'Tablet',
      dosage: '200mg',
      currentQty: 19,
      initialQty: 30,
      refillThreshold: 5,
      frequency: 'Once daily',
      mealRelation: 'With Meal',
      time: '13:00',
      instructions: 'Take consistently with lunch.',
      precautions: 'Regular ECG and pulmonary follow-up required.',
      todayStatus: 'pending',
      takenAt: null,
      dispensedAt: null,
    },

    // Beatrice Foster (P-1008)
    {
      patientIndex: 7,
      name: 'Amlodipine',
      type: 'Tablet',
      dosage: '5mg',
      currentQty: 25,
      initialQty: 30,
      refillThreshold: 5,
      frequency: 'Once daily',
      mealRelation: 'After Breakfast',
      time: '08:30',
      instructions: 'Take in morning with breakfast.',
      precautions: 'Check for ankle swelling (peripheral edema).',
      todayStatus: 'taken',
      takenAt: `${todayStr}T08:38:00Z`,
      dispensedAt: `${todayStr}T08:30:00Z`,
    },
  ];

  prescriptions.forEach((rx) => {
    const medId = uuidv4();
    const schedId = uuidv4();
    const pat = patientData[rx.patientIndex];
    const dev = deviceData[rx.patientIndex];

    insertMedication.run(
      medId,
      pat.id,
      pat.doctorId,
      rx.name,
      rx.type,
      rx.dosage,
      rx.currentQty,
      rx.initialQty,
      rx.refillThreshold,
      rx.frequency,
      rx.mealRelation,
      rx.time,
      '2026-09-01',
      '2026-12-31',
      rx.instructions,
      rx.precautions,
      'Room temperature away from moisture',
      '2027-08-31',
      'active',
      now.toISOString(),
      now.toISOString()
    );

    insertSchedule.run(
      schedId,
      medId,
      pat.id,
      rx.time,
      rx.mealRelation,
      'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
      1,
      now.toISOString()
    );

    // Today's event
    insertEvent.run(
      uuidv4(),
      pat.id,
      medId,
      schedId,
      dev.id,
      `${todayStr}T${rx.time}:00Z`,
      rx.dispensedAt,
      rx.takenAt,
      rx.todayStatus,
      rx.mealRelation,
      `Automated meal-aware schedule for ${rx.mealRelation}`,
      now.toISOString()
    );

    // Past 6 days history for adherence charts
    for (let dayOffset = 1; dayOffset <= 6; dayOffset++) {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - dayOffset);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      // Introduce occasional missed dose for realistic adherence curves (e.g. Eleanor or Margaret)
      let pastStatus: 'taken' | 'missed' = 'taken';
      if (rx.patientIndex === 1 && dayOffset % 2 === 0) pastStatus = 'missed';
      if (rx.patientIndex === 3 && dayOffset % 3 === 0) pastStatus = 'missed';

      insertEvent.run(
        uuidv4(),
        pat.id,
        medId,
        schedId,
        dev.id,
        `${pastDateStr}T${rx.time}:00Z`,
        pastStatus === 'taken' ? `${pastDateStr}T${rx.time}:05Z` : null,
        pastStatus === 'taken' ? `${pastDateStr}T${rx.time}:12Z` : null,
        pastStatus,
        rx.mealRelation,
        'Historical event',
        pastDate.toISOString()
      );
    }
  });

  // 5. Health Records (Blood Pressure, Heart Rate, Glucose, SpO2)
  const insertHealth = db.prepare(`
    INSERT INTO health_records (id, patient_id, recorded_by, blood_pressure_sys, blood_pressure_dia, heart_rate, blood_glucose, temperature, oxygen_saturation, notes, recorded_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  patientData.forEach((pat, idx) => {
    // Generate 4 historical logs
    for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
      const recDate = new Date();
      recDate.setDate(recDate.getDate() - dayOffset);
      recDate.setHours(9, 15, 0, 0);

      const sys = 120 + ((idx * 3 + dayOffset * 2) % 25);
      const dia = 78 + ((idx * 2 + dayOffset) % 14);
      const hr = 68 + ((idx * 4 + dayOffset * 3) % 22);
      const glucose = 95 + ((idx * 7 + dayOffset * 5) % 40);
      const temp = 98.4 + (dayOffset % 2) * 0.3;
      const spo2 = 96 + (dayOffset % 4);

      insertHealth.run(
        uuidv4(),
        pat.id,
        pat.caretakerId,
        sys,
        dia,
        hr,
        glucose,
        temp,
        spo2,
        `Routine vital signs check. Patient reported feeling well.`,
        recDate.toISOString(),
        recDate.toISOString()
      );
    }
  });

  // 6. Alerts
  const insertAlert = db.prepare(`
    INSERT INTO alerts (id, patient_id, device_id, type, severity, title, message, status, acknowledged_by, acknowledged_at, resolved_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Alert 1: Margaret Taylor device offline
  insertAlert.run(
    uuidv4(),
    patientData[3].id,
    deviceData[3].id,
    'device_offline',
    'critical',
    'MediServe Dispenser Offline',
    'Device MED-DEV-104 for Margaret Taylor is disconnected. Battery 0%. Last contact 04:30 AM.',
    'unread',
    null,
    null,
    null,
    now.toISOString()
  );

  // Alert 2: Margaret Taylor low medication refill
  insertAlert.run(
    uuidv4(),
    patientData[3].id,
    deviceData[3].id,
    'refill_required',
    'high',
    'Medication Refill Required',
    'Furosemide 40mg stock has dropped to 3 units (Threshold: 7 units). Refill required within 48h.',
    'unread',
    null,
    null,
    null,
    now.toISOString()
  );

  // Alert 3: Eleanor Vance missed dose
  insertAlert.run(
    uuidv4(),
    patientData[1].id,
    deviceData[1].id,
    'medication_missed',
    'high',
    'Morning Dose Missed',
    'Eleanor Vance did not take Celecoxib 200mg scheduled after breakfast (09:00 AM).',
    'acknowledged',
    sarahId,
    new Date(Date.now() - 3600000).toISOString(),
    null,
    new Date(Date.now() - 7200000).toISOString()
  );

  // Alert 4: James Wilson low battery warning
  insertAlert.run(
    uuidv4(),
    patientData[2].id,
    deviceData[2].id,
    'device_offline',
    'medium',
    'Dispenser Battery Low',
    'Device MED-DEV-103 battery is at 18%. Please dock dispenser to power adapter.',
    'unread',
    null,
    null,
    null,
    new Date(Date.now() - 5400000).toISOString()
  );

  // 7. Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(uuidv4(), adminId, 'SYSTEM_INITIALIZATION', 'SYSTEM', 'core', 'MediServe healthcare database initialized and verified', '127.0.0.1', now.toISOString());
  insertAudit.run(uuidv4(), drSmithId, 'PRESCRIPTION_CREATED', 'medications', 'all', 'Created standard cardiometabolic care plan for Robert Chen', '192.168.1.10', now.toISOString());
  insertAudit.run(uuidv4(), sarahId, 'ALERT_ACKNOWLEDGED', 'alerts', 'alt-001', 'Acknowledged morning missed dose for Eleanor Vance; contacted family', '192.168.1.42', now.toISOString());

  console.log('✅ Database seeded successfully with 8 patients, 6 users, 8 devices, medications, schedules, and alerts.');
}

// Run directly if invoked via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
  closeDatabase();
}
