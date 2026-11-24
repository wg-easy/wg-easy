import { readValidatedBody } from 'nuxt/server';

import * as vpnSettings from '#server/features/vpn/interface';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import {
  DualStackInterfaceUpdateSchema,
  InterfaceUpdateSchema,
} from '#shared/contracts/interface';
import { WG_ENV } from '#server/utils/config';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const data = await readValidatedBody(
    event,
    validateZod(
      WG_ENV.DISABLE_IPV6
        ? InterfaceUpdateSchema
        : DualStackInterfaceUpdateSchema,
      event
    )
  );

  await vpnSettings.update(user, data);
  return { success: true };
});
