import { readValidatedBody } from 'nuxt/server';

import * as clients from '#server/features/vpn/clients';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod, getValidatedRouterParams } from '#server/http/validation';
import {
  ClientGetSchema,
  ClientPublicKeySchema,
} from '#shared/contracts/client';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(ClientGetSchema, event)
  );
  const { publicKey } = await readValidatedBody(
    event,
    validateZod(ClientPublicKeySchema, event)
  );
  await clients.replacePublicKey(user, clientId, publicKey);
  return { success: true };
});
