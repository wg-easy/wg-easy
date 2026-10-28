import { readValidatedBody } from 'nuxt/server';

import * as setupSteps from '#server/features/setup';
import { defineSetupEventHandler } from '#server/utils/handler';
import { FileSchema } from '#shared/contracts/validation';
import { validateZod } from '#server/http/validation';

export default defineSetupEventHandler('migrate', async ({ event }) => {
  const { file } = await readValidatedBody(
    event,
    validateZod(FileSchema, event)
  );
  await setupSteps.importConfiguration(file);
  return { success: true };
});
