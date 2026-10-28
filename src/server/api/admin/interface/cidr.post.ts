import { readValidatedBody } from 'nuxt/server';

import * as vpnSettings from '#server/features/vpn/interface';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import { InterfaceCidrUpdateSchema } from '#shared/contracts/interface';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const data = await readValidatedBody(
    event,
    validateZod(InterfaceCidrUpdateSchema, event)
  );

  await vpnSettings.updateCidr(user, data);
  return { success: true };
});
