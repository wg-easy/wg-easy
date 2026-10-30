import type { LibSQLDatabase } from 'drizzle-orm/libsql';

import type * as schema from './schema';

export type DBType = LibSQLDatabase<typeof schema>;
export type DBTransaction = Parameters<Parameters<DBType['transaction']>[0]>[0];
export type DBExecutor = DBType | DBTransaction;
