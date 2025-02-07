import type { InferSelectModel } from 'drizzle-orm';
import type { general } from './schema';
import z from 'zod';

export type GeneralType = InferSelectModel<typeof general>;

const sessionTimeout = z.number({ message: 'zod.general.sessionTimeout' });

export const GeneralUpdateSchema = z.object({
  sessionTimeout: sessionTimeout,
});

export type GeneralUpdateType = z.infer<typeof GeneralUpdateSchema>;

export type SetupStepType = { step: number; done: boolean };
