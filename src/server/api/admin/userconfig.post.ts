import { UserConfigUpdateSchema } from '#db/repositories/userConfig/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(UserConfigUpdateSchema, event)
    );
    await Database.userConfigs.update(data);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
