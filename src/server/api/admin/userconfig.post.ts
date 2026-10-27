import { readValidatedBody } from 'h3';

import * as vpnSettings from '#server/features/vpn/interface';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import { UserConfigUpdateSchema } from '#shared/contracts/userConfig';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const data = await readValidatedBody(
    event,
    validateZod(UserConfigUpdateSchema, event)
  );
  await vpnSettings.updateDefaults(user, data);
  return { success: true };
});
