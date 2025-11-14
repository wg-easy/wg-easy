import { InterfaceUpdateSchema } from '#db/repositories/interface/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(InterfaceUpdateSchema, event)
    );

    // Allow all updates to be saved to database
    // Overrides will be applied when reading/using the values
    await Database.interfaces.update(data);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
