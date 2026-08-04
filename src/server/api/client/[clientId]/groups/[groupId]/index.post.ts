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

    try {
      await Database.clientGroups.assignClient(clientId, groupId);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Client group not found'
      ) {
        throw createError({
          statusCode: 404,
          statusMessage: error.message,
        });
      }

      throw error;
    }

    await WireGuard.saveConfig();

    return { success: true };
  }
);
