import * as clients from '#server/features/vpn/clients';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod, getValidatedRouterParams } from '#server/http/validation';
import { ClientGetSchema } from '#shared/contracts/client';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(ClientGetSchema, event)
  );

  await clients.apply(user, clientId, 'disable');
  return { success: true };
});
