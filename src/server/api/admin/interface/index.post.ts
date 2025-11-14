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
    if (WG_OVERRIDE_ENV.PORT !== undefined) {
      delete updateData.port;
    }
    if (WG_OVERRIDE_ENV.DEVICE !== undefined) {
      delete updateData.device;
    }
    if (WG_OVERRIDE_ENV.MTU !== undefined) {
      delete updateData.mtu;
    }
    if (WG_OVERRIDE_ENV.IPV4_CIDR !== undefined) {
      delete updateData.ipv4Cidr;
    }
    if (WG_OVERRIDE_ENV.IPV6_CIDR !== undefined) {
      delete updateData.ipv6Cidr;
    }
    if (WG_OVERRIDE_ENV.ENABLED !== undefined) {
      delete updateData.enabled;
    }

    await Database.interfaces.update(updateData);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
