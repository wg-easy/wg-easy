import { ClientGetSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'view',
  async ({ event, checkPermissions }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema, event)
    );
    const client = await Database.clients.get(clientId);
    checkPermissions(client);

    if (!client) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Client not found',
      });
    }

    const config = await WireGuard.getClientConfiguration({ clientId });

    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="${WireGuard.cleanClientFilename(client.name) || clientId}.conf"`
    );

    setHeader(event, 'Content-Type', 'text/plain');
    return config;
  }
);
