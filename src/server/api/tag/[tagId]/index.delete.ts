import * as tags from '#server/features/vpn/tags';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod, getValidatedRouterParams } from '#server/http/validation';
import { TagGetSchema } from '#shared/contracts/tag';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const { tagId } = await getValidatedRouterParams(
    event,
    validateZod(TagGetSchema, event)
  );

  await tags.remove(user, tagId);
  return { success: true };
});
