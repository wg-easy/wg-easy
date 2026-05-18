import { UserSetupSchema } from '#db/repositories/user/types';

export default defineSetupEventHandler(2, async ({ event }) => {
  const { username, password } = await readValidatedBody(
    event,
    validateZod(UserSetupSchema, event)
  );

  await Database.users.create(username, password);

  // If host and port are already set by environment variables, skip step 4
  const host = WG_INITIAL_ENV.HOST ?? WG_CLIENT_OVERRIDE_ENV.HOST;
  const port = WG_INITIAL_ENV.PORT ?? WG_INTERFACE_OVERRIDE_ENV.PORT;

  const setupDone = host && port;

  if (setupDone) {
    // Skip to done
    await Database.general.setSetupStep(0);
  } else {
    // Proceed to step 3 (which leads to step 4)
    await Database.general.setSetupStep(3);
  }

  return { success: true, setupDone: setupDone };
});
