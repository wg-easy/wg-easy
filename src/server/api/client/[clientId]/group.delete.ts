import { createError, getValidatedRouterParams } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { ClientGroupClientParamsSchema } from '#db/repositories/clientGroup/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGroupClientParamsSchema, event)
    );

    try {
      await Database.clientGroups.getClientGroupId(clientId);
      await Database.clientGroups.unassignClient(clientId);
      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.message === 'Client not found') {
        throw createError({
          statusCode: 404,
          statusMessage: error.message,
        });
      }

      throw error;
    }
  }
);
