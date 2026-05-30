import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import * as schema from '../server/database/schema';

const stateDir = process.env.WG_STATE_DIR?.trim() || '/etc/wireguard';
const client = createClient({ url: `file:${stateDir}/wg-easy.db` });
export const db = drizzle({ client, schema });

export { schema };
