import { Cron } from 'croner';
import z from 'zod';

import { controlStringRefine, safeStringRefine, t } from './types';

const ByteLimitSchema = z
  .number({ message: t('zod.quota.bytes') })
  .int(t('zod.quota.bytes'))
  .positive(t('zod.quota.bytes'))
  .max(Number.MAX_SAFE_INTEGER, t('zod.quota.bytes'));

export const QuotaLimitSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('RX'), rxBytes: ByteLimitSchema }),
  z.object({ mode: z.literal('TX'), txBytes: ByteLimitSchema }),
  z.object({ mode: z.literal('TOTAL'), totalBytes: ByteLimitSchema }),
  z.object({
    mode: z.literal('SEPARATE'),
    rxBytes: ByteLimitSchema,
    txBytes: ByteLimitSchema,
  }),
]);

const ResetTimeSchema = z
  .string({ message: t('zod.quota.resetTime') })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, t('zod.quota.resetTime'));

const TimezoneSchema = z
  .string({ message: t('zod.quota.timezone') })
  .refine((timezone) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
      return true;
    } catch {
      return false;
    }
  }, t('zod.quota.timezone'));

export const QuotaResetSchema = z.discriminatedUnion('frequency', [
  z.object({ frequency: z.literal('NONE') }),
  z.object({
    frequency: z.literal('DAILY'),
    time: ResetTimeSchema,
    timezone: TimezoneSchema,
  }),
  z.object({
    frequency: z.literal('WEEKLY'),
    weekday: z.number().int().min(0).max(6),
    time: ResetTimeSchema,
    timezone: TimezoneSchema,
  }),
  z.object({
    frequency: z.literal('MONTHLY'),
    day: z.number().int().min(1).max(31),
    time: ResetTimeSchema,
    timezone: TimezoneSchema,
  }),
]);

const QuotaNameSchema = z
  .string({ message: t('zod.quota.name') })
  .trim()
  .min(1, t('zod.quota.name'))
  .max(64, t('zod.quota.name'))
  .pipe(safeStringRefine)
  .pipe(controlStringRefine);

export const QuotaDefinitionSchema = z.object({
  name: QuotaNameSchema,
  enabled: z.boolean({ message: t('zod.enabled') }),
  limit: QuotaLimitSchema,
  reset: QuotaResetSchema,
  clientIds: z
    .array(z.number().int().positive())
    .max(10_000)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: t('zod.quota.clientIds'),
    }),
});

export type QuotaLimit = z.infer<typeof QuotaLimitSchema>;
export type QuotaReset = z.infer<typeof QuotaResetSchema>;
export type QuotaDefinition = z.infer<typeof QuotaDefinitionSchema>;

export function isQuotaExceeded(
  limit: QuotaLimit,
  usage: { rxBytes: number; txBytes: number }
) {
  switch (limit.mode) {
    case 'RX':
      return usage.rxBytes >= limit.rxBytes;
    case 'TX':
      return usage.txBytes >= limit.txBytes;
    case 'TOTAL':
      return usage.rxBytes + usage.txBytes >= limit.totalBytes;
    case 'SEPARATE':
      return usage.rxBytes >= limit.rxBytes || usage.txBytes >= limit.txBytes;
  }
}

export function calculateCounterDelta(previous: number, current: number) {
  return current >= previous ? current - previous : current;
}

function parseTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return { hour: hour!, minute: minute! };
}

function nextCronRun(
  pattern: string,
  timezone: string,
  from: Date
): Date | null {
  return new Cron(pattern, { paused: true, timezone }).nextRun(from);
}

function getZonedYearMonth(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );
  return { year: Number(values.year), month: Number(values.month) };
}

export function getNextResetAt(reset: QuotaReset, from = new Date()) {
  if (reset.frequency === 'NONE') {
    return null;
  }

  const { hour, minute } = parseTime(reset.time);

  if (reset.frequency === 'DAILY') {
    return nextCronRun(`0 ${minute} ${hour} * * *`, reset.timezone, from);
  }

  if (reset.frequency === 'WEEKLY') {
    return nextCronRun(
      `0 ${minute} ${hour} * * ${reset.weekday}`,
      reset.timezone,
      from
    );
  }

  const current = getZonedYearMonth(from, reset.timezone);
  for (let offset = 0; offset < 24; offset++) {
    const monthIndex = current.month - 1 + offset;
    const year = current.year + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const day = Math.min(reset.day, daysInMonth);
    const next = nextCronRun(
      `0 ${minute} ${hour} ${day} ${month} * ${year}`,
      reset.timezone,
      from
    );

    if (next) {
      return next;
    }
  }

  throw new Error('Unable to calculate the next quota reset');
}
