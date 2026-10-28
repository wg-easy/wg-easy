import { readValidatedBody } from 'nuxt/server';

import * as identity from '#server/features/identity';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import { UserUpdateSchema } from '#shared/contracts/user';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const { name, email } = await readValidatedBody(
    event,
    validateZod(UserUpdateSchema, event)
  );

  await identity.updateProfile(user, name, email);
  return { success: true };
});
