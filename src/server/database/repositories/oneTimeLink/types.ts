import type { InferSelectModel } from 'drizzle-orm';
import type { oneTimeLink } from './schema';
import { z } from 'zod';

export type OneTimeLinkType = InferSelectModel<typeof oneTimeLink>;

const oneTimeLinkType = z
  .string({ message: t('zod.otl') })
  .min(1, t('zod.otl'))
  .pipe(safeStringRefine);

export const OneTimeLinkGetSchema = z.object(
  {
    oneTimeLink: oneTimeLinkType,
  },
  { message: objectMessage }
);
