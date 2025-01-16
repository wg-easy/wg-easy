import type { InferSelectModel } from 'drizzle-orm';
import type { hooks } from './schema';

export type HooksType = InferSelectModel<typeof hooks>;
