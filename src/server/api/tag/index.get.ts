import * as tags from '#server/features/vpn/tags';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';

export default defineAuthenticatedEventHandler(async ({ user }) => {
  return tags.list(user);
});
