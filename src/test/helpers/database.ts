import { fileURLToPath } from 'node:url';

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { onTestFinished } from 'vitest';

import * as schema from '#db/schema';
import { createStore } from '#db/store';
import { setDatabase } from '#db';

const migrations = readMigrationFiles({
  migrationsFolder: fileURLToPath(
    new URL('../../server/database/migrations', import.meta.url)
  ),
}).flatMap((migration) => migration.sql);

export async function databaseFixture() {
  const connection = createClient({ url: ':memory:' });
  onTestFinished(() => connection.close());
  const db = drizzle({ client: connection, schema });
  await connection.migrate(migrations);
  await connection.execute('PRAGMA foreign_keys = ON');
  const store = createStore(db, 'wg0');
  setDatabase(store);
  return { db, connection, store };
}
