import { readValidatedBody } from 'nuxt/server';

import * as identity from '#server/features/identity';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import { UserUpdateTotpSchema } from '#shared/contracts/user';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const body = await readValidatedBody(
    event,
    validateZod(UserUpdateTotpSchema, event)
  );
  if (body.type === 'setup') return identity.setupTotp(user);
  if (body.type === 'create') return identity.verifyTotp(user, body.code);
  return identity.deleteTotp(user, body.currentPassword);
});
