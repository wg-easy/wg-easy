import { readValidatedBody } from 'h3';

import * as setupSteps from '#server/features/setup';
import { defineSetupEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import { UserSetupSchema } from '#shared/contracts/user';

export default defineSetupEventHandler(2, async ({ event }) => {
  const { username, password } = await readValidatedBody(
    event,
    validateZod(UserSetupSchema, event)
  );

  await setupSteps.createAdministrator(username, password);
  return { success: true };
});
