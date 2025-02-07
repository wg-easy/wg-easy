import { ClientGetSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  actions.CLIENT,
  async ({ event }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema)
    );
    const client = await Database.clients.get(clientId);
    if (!client) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Client not found',
      });
    }
    const config = await WireGuard.getClientConfiguration({ clientId });
    const configName = client.name
      .replace(/[^a-zA-Z0-9_=+.-]/g, '-')
      .replace(/(-{2,}|-$)/g, '-')
      .replace(/-$/, '')
      .substring(0, 32);
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="${configName || clientId}.conf"`
    );
    setHeader(event, 'Content-Type', 'text/plain');
    return config;
  }
);
