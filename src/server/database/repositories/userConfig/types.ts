import type { InferSelectModel } from 'drizzle-orm';
import type { userConfig } from './schema';

export type UserConfigType = InferSelectModel<typeof userConfig>;
