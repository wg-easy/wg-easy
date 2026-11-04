import { defineEventHandler, readValidatedBody } from 'nuxt/server';

import { assertPasswordEnabled } from '#server/features/identity';
import { login } from '#server/features/identity/session';
import { validateZod } from '#server/http/validation';
import { UserLoginSchema } from '#shared/contracts/user';

export default defineEventHandler(async (event) => {
  assertPasswordEnabled();
  const credentials = await readValidatedBody(
    event,
    validateZod(UserLoginSchema, event)
  );
  return login(event, credentials);
});
