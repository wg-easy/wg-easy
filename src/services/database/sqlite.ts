import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({ url: 'file:/etc/wireguard/wg0.db' });
const db = drizzle({ client, schema });

export default db;
