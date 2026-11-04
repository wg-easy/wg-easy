import z from 'zod';

import { HookSchema } from '#shared/contracts/validation';

export const HooksUpdateSchema = z.object({
  preUp: HookSchema,
  postUp: HookSchema,
  preDown: HookSchema,
  postDown: HookSchema,
});

export type HooksUpdateType = z.infer<typeof HooksUpdateSchema>;
