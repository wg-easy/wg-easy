import { readValidatedBody } from 'nuxt/server';

import * as clients from '#server/features/vpn/clients';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod, getValidatedRouterParams } from '#server/http/validation';
import { ClientGetSchema, ClientUpdateSchema } from '#shared/contracts/client';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(ClientGetSchema, event)
  );

  const data = await readValidatedBody(
    event,
    validateZod(ClientUpdateSchema, event)
  );

  await clients.update(user, clientId, data);

  return { success: true };
});
