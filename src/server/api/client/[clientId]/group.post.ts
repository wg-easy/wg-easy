import { createError, getValidatedRouterParams, readValidatedBody } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import {
  ClientGroupAssignSchema,
  ClientGroupClientParamsSchema,
} from '#db/repositories/clientGroup/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGroupClientParamsSchema, event)
    );

    const { groupId } = await readValidatedBody(
      event,
      validateZod(ClientGroupAssignSchema, event)
    );

    try {
      await Database.clientGroups.assignClient(clientId, groupId);
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Client not found') {
          throw createError({
            statusCode: 404,
            statusMessage: error.message,
          });
        }

        if (error.message === 'Client group not found') {
          throw createError({
            statusCode: 404,
            statusMessage: error.message,
          });
        }
      }

      throw error;
    }
  }
);
