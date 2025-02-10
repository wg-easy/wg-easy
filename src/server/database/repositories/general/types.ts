import type { InferSelectModel } from 'drizzle-orm';
import type { general } from './schema';
import z from 'zod';

export type GeneralType = InferSelectModel<typeof general>;

const sessionTimeout = z.number({ message: 'zod.general.sessionTimeout' });
const metricsEnabled = z.boolean({ message: 'zod.general.metricsEnabled' });
const metricsPassword = z
  .string({ message: 'zod.general.metricsPassword' })
  .min(1, { message: 'zod.general.metricsPasswordMin' })
  // TODO: validate argon2 regex?
  .nullable();

export const GeneralUpdateSchema = z.object({
  sessionTimeout: sessionTimeout,
  metricsPrometheus: metricsEnabled,
  metricsJson: metricsEnabled,
  metricsPassword: metricsPassword,
});

export type GeneralUpdateType = z.infer<typeof GeneralUpdateSchema>;

export type SetupStepType = { step: number; done: boolean };
