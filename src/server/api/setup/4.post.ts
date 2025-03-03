import { UserConfigSetupSchema } from '#db/repositories/userConfig/types';

export default defineSetupEventHandler(4, async ({ event }) => {
  const { host, port } = await readValidatedBody(
    event,
    validateZod(UserConfigSetupSchema, event)
  );

  await Database.userConfigs.updateHostPort(host, port);

  await Database.general.setSetupStep(0);
  return { success: true };
});
