import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';
import type { hooks } from './schema';

export type HooksType = InferSelectModel<typeof hooks>;

export type HooksUpdateType = Omit<HooksType, 'id' | 'createdAt' | 'updatedAt'>;

export const HooksUpdateSchema = schemaForType<HooksUpdateType>()(
  z.object({
    preUp: HookSchema,
    postUp: HookSchema,
    preDown: HookSchema,
    postDown: HookSchema,
  })
);
