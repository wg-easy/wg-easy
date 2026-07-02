import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';

import type { tcState, TcClass } from './schema';
import { schemaForType, t } from '#server/utils/types';

export type TcStateType = InferSelectModel<typeof tcState>;

export const TcClassSchema = z.object({
  id: z.number().int().min(10),
  ulRate: z.number().int().min(1).max(10000),
  clientIps: z.array(
    z.string().min(1)
  ),
});

export const TcStateUpdateSchema = schemaForType<{
  totalUlRate: number;
  defaultClassId: number;
  classes: TcClass[];
}>()(
  z.object({
    totalUlRate: z.number().int().min(1).max(10000),
    defaultClassId: z.number().int().min(1),
    classes: z.array(TcClassSchema),
  })
);