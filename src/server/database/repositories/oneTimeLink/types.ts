import type { InferSelectModel } from 'drizzle-orm';
import type { oneTimeLink } from './schema';

export type OneTimeLinkType = InferSelectModel<typeof oneTimeLink>;
