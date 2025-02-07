import type { InferSelectModel } from 'drizzle-orm';
import type { hooks } from './schema';
import z from 'zod';

export type HooksType = InferSelectModel<typeof hooks>;

export type HooksUpdateType = Omit<HooksType, 'id' | 'createdAt' | 'updatedAt'>;

const hook = z.string({ message: 'zod.hook' }).pipe(safeStringRefine);

export const HooksUpdateSchema = schemaForType<HooksUpdateType>()(
  z.object({
    preUp: hook,
    postUp: hook,
    preDown: hook,
    postDown: hook,
  })
);
