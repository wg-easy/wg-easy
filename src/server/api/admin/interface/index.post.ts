import { InterfaceUpdateSchema } from '#db/repositories/interface/types';

export default definePermissionEventHandler(
  actions.ADMIN,
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(InterfaceUpdateSchema, event)
    );
    await Database.interfaces.update('wg0', data);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
