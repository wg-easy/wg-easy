import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';
import type { general } from './schema';

export type GeneralType = InferSelectModel<typeof general>;

const sessionTimeout = z.number({ message: t('zod.general.sessionTimeout') });

const metricsEnabled = z.boolean({ message: t('zod.general.metricsEnabled') });

const metricsPassword = z
  .string({ message: t('zod.general.metricsPassword') })
  .min(1, { message: t('zod.general.metricsPassword') })
  .nullable();

export const GeneralUpdateSchema = z.object({
  sessionTimeout: sessionTimeout,
  metricsPrometheus: metricsEnabled,
  metricsJson: metricsEnabled,
  metricsPassword: metricsPassword,
});

export type GeneralUpdateType = z.infer<typeof GeneralUpdateSchema>;

export type SetupStepType = { step: number; done: boolean };
