import { UserSetupSchema } from '#db/repositories/user/types';

export default defineSetupEventHandler(async ({ event }) => {
  const { username, password } = await readValidatedBody(
    event,
    validateZod(UserSetupSchema, event)
  );

  // TODO: validate setup step

  await Database.users.create(username, password);
  await Database.general.setSetupStep(4);
  return { success: true };
});
