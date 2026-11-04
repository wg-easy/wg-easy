import { sendRedirect } from 'nuxt/server';

import { completeOAuth } from '#server/features/identity/session';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  return sendRedirect(event, await completeOAuth(event, user));
});
