import { createError, getValidatedRouterParams } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { ClientGroupGetSchema } from '#db/repositories/clientGroup/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const { groupId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGroupGetSchema, event)
    );

    const group = await Database.clientGroups.get(groupId);

    if (!group) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Client group not found',
      });
    }

    await Database.clientGroups.delete(groupId);
    return { success: true };
  }
);
