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

const bandwidthEnabled = z.boolean({
  message: t('zod.general.bandwidthEnabled'),
});
const bandwidthLimit = z
  .number({ message: t('zod.general.bandwidthLimit') })
  .min(0);

export const GeneralUpdateSchema = z.object({
  sessionTimeout: sessionTimeout,
  metricsPrometheus: metricsEnabled,
  metricsJson: metricsEnabled,
  metricsPassword: metricsPassword,
  bandwidthEnabled: bandwidthEnabled,
  downloadLimitMbps: bandwidthLimit,
  uploadLimitMbps: bandwidthLimit,
});

export type GeneralUpdateType = z.infer<typeof GeneralUpdateSchema>;

export type SetupStepType = { step: number; done: boolean };
