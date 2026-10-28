import { readValidatedBody } from 'nuxt/server';

import * as identity from '#server/features/identity';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import { UserUpdatePasswordSchema } from '#shared/contracts/user';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const { newPassword, currentPassword } = await readValidatedBody(
    event,
    validateZod(UserUpdatePasswordSchema, event)
  );

  await identity.updatePassword(user, currentPassword, newPassword);
  return { success: true };
});
