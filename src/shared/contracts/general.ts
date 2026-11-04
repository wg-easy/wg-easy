import z from 'zod';

import { safeStringRefine, t } from '#shared/contracts/validation';

const sessionTimeout = z.number({
  message: t('validation.general.sessionTimeout'),
});

const metricsEnabled = z.boolean({
  message: t('validation.general.metricsEnabled'),
});

const metricsPassword = z
  .string({ message: t('validation.general.metricsPassword') })
  .min(1, { message: t('validation.general.metricsPassword') })
  .pipe(safeStringRefine)
  .nullable();

export const GeneralUpdateSchema = z.object({
  sessionTimeout: sessionTimeout,
  metricsPrometheus: metricsEnabled,
  metricsJson: metricsEnabled,
  metricsPassword: metricsPassword,
});

export type GeneralUpdateType = z.infer<typeof GeneralUpdateSchema>;

export type SetupStepType = { step: number; done: boolean };
