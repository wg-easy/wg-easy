import { ClientCreateSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'create',
  async ({ event }) => {
    const { name, expiresAt } = await readValidatedBody(
      event,
      validateZod(ClientCreateSchema, event)
    );

    const result = await Database.clients.create({ name, expiresAt });
    await WireGuard.saveConfig();

    const clientId = result[0]!.clientId;
    return { success: true, clientId };
  }
);
