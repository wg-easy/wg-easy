import * as system from '#server/features/system';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';

export default defineAuthenticatedEventHandler(async ({ user }) => {
  return system.ipInformation(user);
});
