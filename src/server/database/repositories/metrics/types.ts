import type { InferSelectModel } from 'drizzle-orm';
import type { prometheus } from './schema';

export type PrometheusType = InferSelectModel<typeof prometheus>;
