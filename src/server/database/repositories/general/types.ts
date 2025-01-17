import type { InferSelectModel } from 'drizzle-orm';
import type { general } from './schema';

export type GeneralType = InferSelectModel<typeof general>;
