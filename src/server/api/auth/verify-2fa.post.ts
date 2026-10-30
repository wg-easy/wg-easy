import { defineEventHandler, readValidatedBody } from 'nuxt/server';

import { completeSecondFactor } from '#server/features/identity/session';
import { validateZod } from '#server/http/validation';
import { Verify2faSchema } from '#shared/contracts/user';

export default defineEventHandler(async (event) => {
  const { totpCode } = await readValidatedBody(
    event,
    validateZod(Verify2faSchema, event)
  );
  return completeSecondFactor(event, totpCode);
});
