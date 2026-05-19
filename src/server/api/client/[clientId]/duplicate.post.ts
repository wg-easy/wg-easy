import { ClientDuplicateSchema, ClientGetSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'create',
  async ({ event, checkPermissions }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema, event)
    );

    const { name } = await readValidatedBody(
      event,
      validateZod(ClientDuplicateSchema, event)
    );

    const client = await Database.clients.get(clientId);
    checkPermissions(client);
 
    const result = await Database.clients.createFromExistingId({ name, clientId });
    await WireGuard.saveConfig();

    const newClientId = result[0]!.clientId;
    return { success: true, newClientId };
  }
);
