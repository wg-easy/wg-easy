import { getValidatedRouterParams, setHeader } from 'h3';

import * as provisioning from '#server/features/vpn/provisioning';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import { ClientGetSchema } from '#shared/contracts/client';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(ClientGetSchema, event)
  );
  const download = await provisioning.download(user, clientId);
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${download.filename}"`
  );
  setHeader(event, 'Content-Type', 'application/octet-stream');
  return download.contents;
});
