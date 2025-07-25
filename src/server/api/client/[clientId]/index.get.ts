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

    const data = await WireGuard.dumpByPublicKey(result.publicKey);
    if (!data) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to dump client data',
      });
    }

    return {
      ...result,
      endpoint: data.endpoint,
    };
  }
);
