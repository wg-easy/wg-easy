import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:/etc/wireguard/wg0.db' });
const db = drizzle({ client });

export default db;
