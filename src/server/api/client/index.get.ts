import { ClientQuerySchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'custom',
  async ({ event, user }) => {
    const { filter } = await getValidatedQuery(
      event,
      validateZod(ClientQuerySchema, event)
    );

    if (user.role === roles.ADMIN) {
      return WireGuard.getAllClients(filter);
    }
    return WireGuard.getClientsForUser(user.id, filter);
  }
);
