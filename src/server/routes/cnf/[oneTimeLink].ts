import { defineEventHandler, isNuxtError } from 'nuxt/server';

import * as provisioning from '#server/features/vpn/provisioning';
import { logSecurityEvent } from '#server/utils/securityLogger';
import { validateZod, getValidatedRouterParams } from '#server/http/validation';
import { OneTimeLinkGetSchema } from '#shared/contracts/oneTimeLink';

export default defineEventHandler(async (event) => {
  const { oneTimeLink } = await getValidatedRouterParams(
    event,
    validateZod(OneTimeLinkGetSchema, event)
  );
  try {
    const download = await provisioning.redeemOneTimeLink(oneTimeLink);
    event.res.headers.set(
      'Content-Disposition',
      `attachment; filename="${download.filename}"`
    );
    event.res.headers.set('Content-Type', 'application/octet-stream');
    return download.contents;
  } catch (error) {
    if (isNuxtError(error) && error.status === 404)
      logSecurityEvent(event, 'one-time-link');
    throw error;
  }
});
