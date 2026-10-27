import { readValidatedBody } from 'h3';

import * as settings from '#server/features/settings';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import { GeneralUpdateSchema } from '#shared/contracts/general';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const data = await readValidatedBody(
    event,
    validateZod(GeneralUpdateSchema, event)
  );
  await settings.update(user, data);
  return { success: true };
});
