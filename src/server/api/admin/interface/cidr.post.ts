import { InterfaceCidrUpdateSchema } from '#db/repositories/interface/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(InterfaceCidrUpdateSchema, event)
    );

    // Remove overridden fields from the update data
    const updateData = { ...data };
    if (WG_OVERRIDE_ENV.IPV4_CIDR !== undefined) {
      delete updateData.ipv4Cidr;
    }
    if (WG_OVERRIDE_ENV.IPV6_CIDR !== undefined) {
      delete updateData.ipv6Cidr;
    }

    await Database.interfaces.updateCidr(updateData);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
