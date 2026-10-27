import { readValidatedBody } from 'h3';

import * as setupSteps from '#server/features/setup';
import { defineSetupEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import { UserConfigSetupSchema } from '#shared/contracts/userConfig';

export default defineSetupEventHandler(4, async ({ event }) => {
  const { host, port } = await readValidatedBody(
    event,
    validateZod(UserConfigSetupSchema, event)
  );

  await setupSteps.configureEndpoint(host, port);
  return { success: true };
});
