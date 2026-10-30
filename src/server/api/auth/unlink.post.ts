import * as identity from '#server/features/identity';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';

export default defineAuthenticatedEventHandler(async ({ user }) => {
  await identity.unlinkOauth(user);

  return { success: true };
});
