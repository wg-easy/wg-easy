import { createError, getValidatedRouterParams, readValidatedBody } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { TagGetSchema, TagUpdateSchema } from '#db/repositories/tag/types';

export default definePermissionEventHandler(
  'tags',
  'update',
  async ({ event }) => {
    const { tagId } = await getValidatedRouterParams(
      event,
      validateZod(TagGetSchema, event)
    );

    const data = await readValidatedBody(
      event,
      validateZod(TagUpdateSchema, event)
    );

    const tag = await Database.tags.get(tagId);
    if (!tag) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Tag not found',
      });
    }

    await Database.tags.update(tagId, data);
    return { success: true };
  }
);
