import { InterfaceUpdateSchema } from '#db/repositories/interface/types';
import { firewall } from '#utils/firewall';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(InterfaceUpdateSchema, event)
    );

    // If enabling firewall, check if iptables is available
    if (data.firewallEnabled) {
      // Clear cache to force fresh check
      firewall.clearAvailabilityCache();

      const iptablesAvailable = await firewall.isAvailable(!WG_ENV.DISABLE_IPV6);
      if (!iptablesAvailable) {
        const requiredTools = WG_ENV.DISABLE_IPV6
          ? 'iptables'
          : 'iptables and ip6tables';
        throw createError({
          statusCode: 400,
          statusMessage: `Per-Client Firewall requires ${requiredTools} to be installed on the host system. Please install ${requiredTools} before enabling this feature.`,
        });
      }
    }

    await Database.interfaces.update(data);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
