import * as provisioning from '#server/features/vpn/provisioning';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod, getValidatedRouterParams } from '#server/http/validation';
import { ClientGetSchema } from '#shared/contracts/client';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(ClientGetSchema, event)
  );
  const download = await provisioning.download(user, clientId);
  event.res.headers.set(
    'Content-Disposition',
    `attachment; filename="${download.filename}"`
  );
  event.res.headers.set('Content-Type', 'application/octet-stream');
  return download.contents;
});
