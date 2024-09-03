import type { Low } from 'lowdb';
import type { Database } from '../repositories/database';
import { run1 } from './1';

export async function migrationRunner(db: Low<Database>) {
  const migrations = db.data.migrations;
  if (!migrations.includes('1')) {
    await run1(db);
  }
}
