import { ClientQuerySchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'custom',
  async ({ event, user }) => {
    const { filter, page, limit, sortClient } = await getValidatedQuery(
      event,
      validateZod(ClientQuerySchema, event)
    );
    
    if (user.role === roles.ADMIN) {
      return WireGuard.getAllClients({ filter: filter, page: page, limit: limit, sortClient: sortClient });
    }
    return WireGuard.getClientsForUser(user.id, { filter: filter, page: page, limit: limit, sortClient: sortClient });
  }
);
