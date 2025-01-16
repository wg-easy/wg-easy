import type { InferSelectModel } from 'drizzle-orm';
import type { user } from './schema';

export type UserType = InferSelectModel<typeof user>;
