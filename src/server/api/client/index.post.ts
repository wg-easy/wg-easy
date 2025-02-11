import { ClientCreateSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'create',
  async ({ event }) => {
    const { name, expiresAt } = await readValidatedBody(
      event,
      validateZod(ClientCreateSchema)
    );

    await Database.clients.create({ name, expiresAt });
    await WireGuard.saveConfig();
    return { success: true };
  }
);
