import { defineEventHandler, getRequestURL, sendRedirect } from 'nuxt/server';

import { status } from '#server/features/setup';
import { setupRedirect } from '#shared/utils/setupRedirect';

export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event);
  if (pathname.startsWith('/api/') || pathname.startsWith('/_i18n/')) {
    return;
  }

  const { step } = await status();
  event.context.setupStep = step;
  const redirect = setupRedirect(pathname, step);
  if (redirect) {
    return sendRedirect(event, redirect, 302);
  }
});
