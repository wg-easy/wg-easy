import { ClientGetSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  actions.CLIENT,
  async ({ event }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema)
    );
    await Database.clients.delete(clientId);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
