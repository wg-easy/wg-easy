import { drizzle } from 'drizzle-orm/libsql';
import { migrate as drizzleMigrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';

import * as schema from './schema';
import { ClientService } from './repositories/client/service';

const client = createClient({ url: 'file:/etc/wireguard/wg0.db' });
const db = drizzle({ client, schema });

export async function connect() {
  await migrate();
  return new DBService(db);
}

class DBService {
  clients = new ClientService(db);
  constructor(private db: DBType) {}
}

export type DBType = typeof db;
export type DBServiceType = DBService;

async function migrate() {
  try {
    console.log('Migrating database...');
    await drizzleMigrate(db, {
      migrationsFolder: './services/database/migrations',
    });
    console.log('Migration complete');
  } catch (e) {
    if (e instanceof Error) {
      console.log('Failed to migrate database:', e.message);
    }
  }
}
