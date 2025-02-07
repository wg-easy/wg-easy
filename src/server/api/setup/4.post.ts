import { UserSetupType } from '#db/repositories/user/types';

export default defineSetupEventHandler(async ({ event }) => {
  const { username, password } = await readValidatedBody(
    event,
    validateZod(UserSetupType, event)
  );

  await Database.users.create(username, password);
  await Database.general.setSetupStep(5);
  return { success: true };
});
