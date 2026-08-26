import { createError, getValidatedRouterParams } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { TagGetSchema } from '#db/repositories/tag/types';

export default definePermissionEventHandler(
  'tags',
  'delete',
  async ({ event }) => {
    const { tagId } = await getValidatedRouterParams(
      event,
      validateZod(TagGetSchema, event)
    );

    const tag = await Database.tags.get(tagId);
    if (!tag) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Tag not found',
      });
    }

    await Database.tags.delete(tagId);
    return { success: true };
  }
);
