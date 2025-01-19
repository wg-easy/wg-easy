import { InterfaceCidrUpdateSchema } from '#db/repositories/interface/types';

export default definePermissionEventHandler(
  actions.ADMIN,
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(InterfaceCidrUpdateSchema, event)
    );

    await Database.interfaces.updateCidr('wg0', data);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
