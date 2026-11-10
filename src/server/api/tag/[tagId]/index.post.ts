import { readValidatedBody } from 'nuxt/server';

import * as tags from '#server/features/vpn/tags';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod, getValidatedRouterParams } from '#server/http/validation';
import { TagGetSchema, TagUpdateSchema } from '#shared/contracts/tag';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const { tagId } = await getValidatedRouterParams(
    event,
    validateZod(TagGetSchema, event)
  );

  const data = await readValidatedBody(
    event,
    validateZod(TagUpdateSchema, event)
  );

  await tags.update(user, tagId, data);
  return { success: true };
});
