import { createError } from 'nuxt/server';

import { encodeQRCode, templateQrMessage } from '#server/utils/qr';
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
  if (download.isTemplate) {
    throw createError({ status: 409, message: templateQrMessage });
  }
  event.res.headers.set('Content-Type', 'image/svg+xml');
  return encodeQRCode(download.contents);
});
