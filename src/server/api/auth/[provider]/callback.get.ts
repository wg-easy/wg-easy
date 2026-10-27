import { defineEventHandler, sendRedirect } from 'h3';

import { completeOAuth } from '#server/features/identity/session';

export default defineEventHandler(async (event) => {
  return sendRedirect(event, await completeOAuth(event));
});
