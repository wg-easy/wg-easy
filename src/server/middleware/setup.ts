import { defineEventHandler, getRequestURL, sendRedirect } from 'nuxt/server';

import * as setupSteps from '#server/features/setup';
import { setupRedirect } from '#shared/utils/setupRedirect';

/* First setup of wg-easy */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_i18n/')) {
    return;
  }

  const { step } = await setupSteps.status();
  event.context.setupStep = step;
  const redirect = setupRedirect(url.pathname, step);
  if (redirect) {
    return sendRedirect(event, redirect, 302);
  }
});
