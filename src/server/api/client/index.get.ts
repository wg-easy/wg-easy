import { getValidatedQuery } from 'h3';

import WireGuard from '#server/utils/WireGuard';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { roles } from '#shared/utils/permissions';
import { ClientQuerySchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'custom',
  async ({ event, user }) => {
    const { filter, sort } = await getValidatedQuery(
      event,
      validateZod(ClientQuerySchema, event)
    );

    if (user.role === roles.ADMIN) {
      return WireGuard.getAllClients({ filter, sort });
    }
    return WireGuard.getClientsForUser(user.id, { filter, sort });
  }
);
