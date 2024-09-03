import type { Low } from 'lowdb';
import type { Database } from '../repositories/database';
import { run1 } from './1';

export type MIGRATION_FN = (db: Low<Database>) => Promise<void>;

const MIGRATION_LIST = {
  // Adds Initial Database Structure
  '1': run1,
} satisfies Record<string, MIGRATION_FN>;

/**
 * Runs all migrations
 * @throws
 */
export async function migrationRunner(db: Low<Database>) {
  const ranMigrations = db.data.migrations;
  const runMigrations = Object.keys(
    MIGRATION_LIST
  ) as (keyof typeof MIGRATION_LIST)[];
  for (const migrationId of runMigrations) {
    if (ranMigrations.includes(migrationId)) {
      continue;
    }
    try {
      await MIGRATION_LIST[migrationId](db);
      db.data.migrations.push(migrationId);
    } catch (e) {
      throw new Error(`Failed to run Migration ${migrationId}: ${e}`);
    }
  }
  await db.write();
}
