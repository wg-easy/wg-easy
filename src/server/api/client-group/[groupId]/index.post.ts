import { createError, getValidatedRouterParams, readValidatedBody } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import {
  ClientGroupGetSchema,
  ClientGroupUpdateSchema,
} from '#db/repositories/clientGroup/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const { groupId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGroupGetSchema, event)
    );

    const data = await readValidatedBody(
      event,
      validateZod(ClientGroupUpdateSchema, event)
    );

    try {
      const group = await Database.clientGroups.update(groupId, data);
      return { success: true, group };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Client group not found') {
          throw createError({
            statusCode: 404,
            statusMessage: error.message,
          });
        }

        if (error.message === 'Client group already exists') {
          throw createError({
            statusCode: 409,
            statusMessage: error.message,
          });
        }
      }

      throw error;
    }
  }
);
