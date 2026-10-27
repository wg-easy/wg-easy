import { readValidatedBody } from 'h3';

import * as vpnSettings from '#server/features/vpn/interface';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import { InterfaceUpdateSchema } from '#shared/contracts/interface';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const data = await readValidatedBody(
    event,
    validateZod(InterfaceUpdateSchema, event)
  );

  await vpnSettings.update(user, data);
  return { success: true };
});
