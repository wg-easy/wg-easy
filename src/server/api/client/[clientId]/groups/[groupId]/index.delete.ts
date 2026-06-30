import { createError, getValidatedRouterParams } from 'h3';

import Database from '#server/utils/Database';
import WireGuard from '#server/utils/WireGuard';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { ClientGroupMembershipDeleteParamsSchema } from '#db/repositories/clientGroup/types';

export default definePermissionEventHandler(
  'clients',
  'update',
  async ({ event, checkPermissions }) => {
    const { clientId, groupId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGroupMembershipDeleteParamsSchema, event)
    );

    const client = await Database.clients.get(clientId);
    checkPermissions(client);

    if (!client) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Client not found',
      });
    }

    await Database.clientGroups.removeClient(clientId, groupId);
    await WireGuard.saveConfig();

    return { success: true };
  }
);
