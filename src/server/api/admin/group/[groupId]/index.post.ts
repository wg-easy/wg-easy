import { createError, getValidatedRouterParams, readValidatedBody } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import {
  GroupGetSchema,
  GroupUpdateSchema,
} from '#db/repositories/group/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const { groupId } = await getValidatedRouterParams(
      event,
      validateZod(GroupGetSchema, event)
    );

    const data = await readValidatedBody(
      event,
      validateZod(GroupUpdateSchema, event)
    );

    const group = await Database.groups.get(groupId);

    if (!group) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Group not found',
      });
    }

    await Database.groups.update(groupId, data);

    return { success: true };
  }
);
