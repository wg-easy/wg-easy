import { readValidatedBody } from 'h3';

import * as vpnSettings from '#server/features/vpn/interface';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import { HooksUpdateSchema } from '#shared/contracts/hooks';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const data = await readValidatedBody(
    event,
    validateZod(HooksUpdateSchema, event)
  );
  await vpnSettings.updateHooks(user, data);
  return { success: true };
});
