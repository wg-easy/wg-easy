import type { InferSelectModel } from 'drizzle-orm';
import type { wgInterface } from './schema';

export type InterfaceType = InferSelectModel<typeof wgInterface>;
