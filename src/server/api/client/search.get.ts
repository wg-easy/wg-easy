import { ClientQuerySchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'custom',
  async ({ event, user }) => {
    const { filter } = await getValidatedQuery(
      event,
      validateZod(ClientQuerySchema, event)
    );

    // Filter is used to search by name, IPv4, or IPv6
    if (user.role === roles.ADMIN) {
      return WireGuard.getAllClients(filter);
    }
    return WireGuard.getClientsForUser(user.id, filter);
  }
);
