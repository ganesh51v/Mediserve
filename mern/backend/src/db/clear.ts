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

export async function clearDatabase(): Promise<void> {
  await connectDB();
  console.log('🧹 Clearing all collections from MongoDB...');

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

  console.log('✅ MongoDB database is now completely clean and empty (0 records).');
}

if (process.argv[1]?.includes('clear')) {
  clearDatabase()
    .then(() => closeDB())
    .catch((err) => {
      console.error('Error clearing database:', err);
      process.exit(1);
    });
}
