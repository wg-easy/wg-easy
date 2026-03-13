import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import * as schema from '../server/database/schema';

//const client = createClient({ url: 'file:../data/wg-easy.db' });
const client = createClient({ url: 'file:/etc/wireguard/wg-easy.db' });
export const db = drizzle({ client, schema });

export { schema };
