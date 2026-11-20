import { readValidatedBody } from 'nuxt/server';

import * as tags from '#server/features/vpn/tags';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import { TagCreateSchema } from '#shared/contracts/tag';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const data = await readValidatedBody(
    event,
    validateZod(TagCreateSchema, event)
  );

  const tagId = await tags.create(user, data);
  return { success: true, tagId };
});
