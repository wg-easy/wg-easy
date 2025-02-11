import { ClientGetSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'update',
  async ({ event, checkPermissions }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema)
    );

    const client = await Database.clients.get(clientId);
    checkPermissions(client);

    await Database.oneTimeLinks.generate(clientId);
    return { success: true };
  }
);
