import { UserConfigUpdateSchema } from '#db/repositories/userConfig/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(UserConfigUpdateSchema, event)
    );

    // Remove overridden fields from the update data
    const updateData = { ...data };
    if (WG_CLIENT_OVERRIDE_ENV.HOST !== undefined) {
      delete updateData.host;
    }
    if (WG_CLIENT_OVERRIDE_ENV.CLIENT_PORT !== undefined) {
      delete updateData.port;
    }
    if (WG_CLIENT_OVERRIDE_ENV.DEFAULT_DNS !== undefined) {
      delete updateData.defaultDns;
    }
    if (WG_CLIENT_OVERRIDE_ENV.DEFAULT_ALLOWED_IPS !== undefined) {
      delete updateData.defaultAllowedIps;
    }
    if (WG_CLIENT_OVERRIDE_ENV.DEFAULT_MTU !== undefined) {
      delete updateData.defaultMtu;
    }
    if (WG_CLIENT_OVERRIDE_ENV.DEFAULT_PERSISTENT_KEEPALIVE !== undefined) {
      delete updateData.defaultPersistentKeepalive;
    }

    await Database.userConfigs.update(updateData);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
