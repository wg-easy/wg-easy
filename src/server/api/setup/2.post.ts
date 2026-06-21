import { readValidatedBody } from 'h3';

import Database from '#server/utils/Database';
import { defineSetupEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { UserSetupSchema } from '#db/repositories/user/types';

export default defineSetupEventHandler(2, async ({ event }) => {
  const { username, password } = await readValidatedBody(
    event,
    validateZod(UserSetupSchema, event)
  );

  await Database.users.create(username, password);

  await Database.general.setSetupStep(3);
  return { success: true };
});
