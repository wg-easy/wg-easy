import type { Low } from 'lowdb';
import type { Database } from '../repositories/database';
import { run1 } from './1';

export type MIGRATION_FN = (db: Low<Database>) => Promise<void>;

const MIGRATION_LIST = [
  // Adds Initial Database Structure
  { id: '1', fn: run1 },
] satisfies { id: string; fn: MIGRATION_FN }[];

/**
 * Runs all migrations
 * @throws
 */
export async function migrationRunner(db: Low<Database>) {
  const ranMigrations = db.data.migrations;
  for (const migration of MIGRATION_LIST) {
    if (ranMigrations.includes(migration.id)) {
      continue;
    }
    try {
      await migration.fn(db);
      db.data.migrations.push(migration.id);
    } catch (e) {
      throw new Error(`Failed to run Migration ${migration.id}: ${e}`);
    }
  }
  await db.write();
}
