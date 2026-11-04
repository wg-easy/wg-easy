import { defineEventHandler, sendRedirect } from 'nuxt/server';

import { completeOAuth } from '#server/features/identity/session';

export default defineEventHandler(async (event) => {
  return sendRedirect(event, await completeOAuth(event));
});
