import { ClientGetSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'update',
  async ({ event, checkPermissions }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema, event)
    );

    const client = await Database.clients.get(clientId);
    checkPermissions(client);

    if (client && client.expiresAt !== null && new Date() > new Date(client.expiresAt)) {
      throw createError({
        statusCode: 422,
        statusMessage:
          'Client is expired. Please update the expiration date first.',
        message: 'Client is expired. Please update the expiration date first.',
      });
    }

    await Database.clients.toggle(clientId, true);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
