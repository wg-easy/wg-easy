import {
  isError,
  defineEventHandler,
  getValidatedRouterParams,
  setHeader,
} from 'h3';

import * as provisioning from '#server/features/vpn/provisioning';
import { logSecurityEvent } from '#server/utils/securityLogger';
import { validateZod } from '#server/http/validation';
import { OneTimeLinkGetSchema } from '#shared/contracts/oneTimeLink';

export default defineEventHandler(async (event) => {
  const { oneTimeLink } = await getValidatedRouterParams(
    event,
    validateZod(OneTimeLinkGetSchema, event)
  );
  try {
    const download = await provisioning.redeemOneTimeLink(oneTimeLink);
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="${download.filename}"`
    );
    setHeader(event, 'Content-Type', 'application/octet-stream');
    return download.contents;
  } catch (error) {
    if (isError(error) && error.statusCode === 404)
      logSecurityEvent(event, 'one-time-link');
    throw error;
  }
});
