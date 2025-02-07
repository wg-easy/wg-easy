import { UserConfigUpdateSchema } from '#db/repositories/userConfig/types';

export default definePermissionEventHandler(
  actions.ADMIN,
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(UserConfigUpdateSchema, event)
    );
    await Database.userConfigs.update('wg0', data);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
