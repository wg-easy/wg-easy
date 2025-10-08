import { ClientGetSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'view',
  async ({ event, checkPermissions }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema, event)
    );

    const result = await Database.clients.get(clientId);
    checkPermissions(result);

    if (!result) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Client not found',
      });
    }

    // data can be undefined if the client is disabled
    const data = await WireGuard.dumpByPublicKey(result.publicKey);

    return {
      ...result,
      endpoint: data?.endpoint,
    };
  }
);
