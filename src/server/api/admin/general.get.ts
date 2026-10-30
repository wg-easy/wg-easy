import * as settings from '#server/features/settings';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';

export default defineAuthenticatedEventHandler(async ({ user }) => {
  return settings.get(user);
});
