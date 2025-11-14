import { InterfaceUpdateSchema } from '#db/repositories/interface/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(InterfaceUpdateSchema, event)
    );

    // Remove overridden fields from the update data
    const updateData = { ...data };
    if (WG_OVERRIDE_ENV.INTERFACE_PORT !== undefined) {
      delete updateData.port;
    }
    if (WG_OVERRIDE_ENV.INTERFACE_DEVICE !== undefined) {
      delete updateData.device;
    }
    if (WG_OVERRIDE_ENV.INTERFACE_MTU !== undefined) {
      delete updateData.mtu;
    }

    await Database.interfaces.update(updateData);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
