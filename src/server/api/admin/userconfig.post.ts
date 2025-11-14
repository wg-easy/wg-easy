import { UserConfigUpdateSchema } from '#db/repositories/userConfig/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(UserConfigUpdateSchema, event)
    );

    // Allow all updates to be saved to database
    // Overrides will be applied when reading/using the values
    await Database.userConfigs.update(data);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
