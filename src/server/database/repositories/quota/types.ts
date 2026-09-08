import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';

import type { quota } from './schema';

import {
  QuotaDefinitionSchema,
  type QuotaDefinition,
  type QuotaLimit,
  type QuotaReset,
} from '#server/utils/quota';

export type QuotaType = InferSelectModel<typeof quota>;
export type QuotaInput = QuotaDefinition;
export type QuotaPublic = QuotaInput &
  Pick<
    QuotaType,
    | 'id'
    | 'usedRxBytes'
    | 'usedTxBytes'
    | 'exceededAt'
    | 'lastResetAt'
    | 'nextResetAt'
    | 'createdAt'
    | 'updatedAt'
  > & { clientCount: number };

export const QuotaCreateSchema = QuotaDefinitionSchema;
export const QuotaUpdateSchema = QuotaDefinitionSchema;
export const QuotaIdSchema = z.object({
  quotaId: z.coerce.number().int().positive(),
});
export const ClientQuotaAssignmentSchema = z.object({
  quotaId: z.number().int().positive().nullable(),
});

export function quotaLimitFromRow(row: QuotaType): QuotaLimit {
  switch (row.mode) {
    case 'RX':
      return { mode: row.mode, rxBytes: row.rxBytes! };
    case 'TX':
      return { mode: row.mode, txBytes: row.txBytes! };
    case 'TOTAL':
      return { mode: row.mode, totalBytes: row.totalBytes! };
    case 'SEPARATE':
      return {
        mode: row.mode,
        rxBytes: row.rxBytes!,
        txBytes: row.txBytes!,
      };
  }
}

export function quotaResetFromRow(row: QuotaType): QuotaReset {
  switch (row.resetFrequency) {
    case 'NONE':
      return { frequency: row.resetFrequency };
    case 'DAILY':
      return {
        frequency: row.resetFrequency,
        time: row.resetTime!,
        timezone: row.resetTimezone!,
      };
    case 'WEEKLY':
      return {
        frequency: row.resetFrequency,
        weekday: row.resetWeekday!,
        time: row.resetTime!,
        timezone: row.resetTimezone!,
      };
    case 'MONTHLY':
      return {
        frequency: row.resetFrequency,
        day: row.resetDay!,
        time: row.resetTime!,
        timezone: row.resetTimezone!,
      };
  }
}
