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
    const query = await getValidatedQuery(
      event,
      validateZod(ClientQuerySchema, event)
    );

    return WireGuard.getClientsPage(
      query,
      user.role === roles.ADMIN ? undefined : user.id
    );
  }
);
