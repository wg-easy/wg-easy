import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';
import type { hooks } from './schema';

export type HooksType = InferSelectModel<typeof hooks>;

export type HooksUpdateType = Omit<HooksType, 'id' | 'createdAt' | 'updatedAt'>;

const hook = z.string({ message: t('zod.hook') }).pipe(safeStringRefine);

export const HooksUpdateSchema = schemaForType<HooksUpdateType>()(
  z.object({
    preUp: hook,
    postUp: hook,
    preDown: hook,
    postDown: hook,
  })
);
