import { readValidatedBody } from 'nuxt/server';

import * as clients from '#server/features/vpn/clients';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import { ClientCreateSchema } from '#shared/contracts/client';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const { name, expiresAt } = await readValidatedBody(
    event,
    validateZod(ClientCreateSchema, event)
  );

  const clientId = await clients.create(user, {
    name,
    expiresAt,
  });
  return { success: true, clientId };
});
