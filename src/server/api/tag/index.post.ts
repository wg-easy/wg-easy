import { readValidatedBody } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { TagCreateSchema } from '#db/repositories/tag/types';

export default definePermissionEventHandler(
  'tags',
  'create',
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(TagCreateSchema, event)
    );

    const result = await Database.tags.create(data);

    const tagId = result[0]!.id;
    return { success: true, tagId };
  }
);
