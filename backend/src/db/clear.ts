import { getDatabase, closeDatabase } from './database.js';

export function clearDatabase() {
  const db = getDatabase();
  console.log('🧹 Clearing all records from database...');

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
    VACUUM;
  `);

  console.log('✅ Database is now completely clean and empty (ready for fresh use).');
}

// If executed directly
if (process.argv[1]?.includes('clear')) {
  clearDatabase();
  closeDatabase();
}
