import { exec } from '../utils/cmd';
import { WG_ENV } from '../utils/config';
import { parseIpAndPort } from '../utils/ip';
import type { ClientType } from '#db/repositories/client/types';
import { isIPv6 } from 'is-ip';

declare module 'nitropack/types' {
  interface NitroRuntimeHooks {
    'wireguard:config': () => void;
    'wireguard:start': () => void;
  }
}

/**
 * Client Traffic Restriction Plugin
 *
 * This plugin manages iptables/ip6tables rules to restrict client traffic
 * based on configured allowed IPs. It integrates with wireguard lifecycle hooks.
 */
export default defineNitroPlugin(async (nitroApp) => {
  console.log('Client Traffic Restriction Plugin loaded');

  /**
   * Generates iptables rules for a specific client based on their allowed IPs.
   *
   * @param client - The client configuration
   * @returns Array of iptables command strings
   */
  const generateClientIptablesRules = (
    client: Omit<ClientType, 'createdAt' | 'updatedAt'>
  ): string[] => {
    const rules: string[] = [];

    // Extract IP addresses from client configuration (remove CIDR prefix)
    const clientIp = client.ipv4Address.split('/')[0];
    const clientIpv6 = client.ipv6Address?.split('/')[0];

    // Generate rules for each allowed IP if configured
    if (client.allowedIps && client.allowedIps.length > 0) {
      client.allowedIps.forEach((allowedIpWithPort) => {
        const { ip: allowedIp, port } = parseIpAndPort(allowedIpWithPort);

        if (isIPv6(allowedIp)) {
          // IPv6: generate ip6tables rules
          if (!WG_ENV.DISABLE_IPV6 && clientIpv6) {
            if (port) {
              // TCP port rules
              rules.push(
                `ip6tables -A FORWARD -s ${clientIpv6} -d ${allowedIp} -p tcp --dport ${port} -j ACCEPT`
              );
              rules.push(
                `ip6tables -A FORWARD -d ${clientIpv6} -s ${allowedIp} -p tcp --sport ${port} -j ACCEPT`
              );
              // UDP port rules
              rules.push(
                `ip6tables -A FORWARD -s ${clientIpv6} -d ${allowedIp} -p udp --dport ${port} -j ACCEPT`
              );
              rules.push(
                `ip6tables -A FORWARD -d ${clientIpv6} -s ${allowedIp} -p udp --sport ${port} -j ACCEPT`
              );
            } else {
              // No port restriction - allow all traffic
              rules.push(
                `ip6tables -A FORWARD -s ${clientIpv6} -d ${allowedIp} -j ACCEPT`
              );
              rules.push(
                `ip6tables -A FORWARD -d ${clientIpv6} -s ${allowedIp} -j ACCEPT`
              );
            }
          }
        } else {
          // IPv4: generate iptables rules
          if (port) {
            // TCP port rules
            rules.push(
              `iptables -A FORWARD -s ${clientIp} -d ${allowedIp} -p tcp --dport ${port} -j ACCEPT`
            );
            rules.push(
              `iptables -A FORWARD -d ${clientIp} -s ${allowedIp} -p tcp --sport ${port} -j ACCEPT`
            );
            // UDP port rules
            rules.push(
              `iptables -A FORWARD -s ${clientIp} -d ${allowedIp} -p udp --dport ${port} -j ACCEPT`
            );
            rules.push(
              `iptables -A FORWARD -d ${clientIp} -s ${allowedIp} -p udp --sport ${port} -j ACCEPT`
            );
          } else {
            // No port restriction - allow all traffic
            rules.push(
              `iptables -A FORWARD -s ${clientIp} -d ${allowedIp} -j ACCEPT`
            );
            rules.push(
              `iptables -A FORWARD -d ${clientIp} -s ${allowedIp} -j ACCEPT`
            );
          }
        }
      });
    } else {
      // Default: allow access to server only when no allowed IPs configured
      const serverIps = ['10.8.0.1/32'];
      serverIps.forEach((serverIp) => {
        rules.push(
          `iptables -A FORWARD -s ${clientIp} -d ${serverIp} -j ACCEPT`
        );
        rules.push(
          `iptables -A FORWARD -d ${clientIp} -s ${serverIp} -j ACCEPT`
        );
      });
    }

    return rules;
  };

  /**
   * Applies all client-specific iptables rules.
   * Clears existing rules and sets up new ones based on current client configuration.
   */
  const applyClientIptablesRules = async () => {
    try {
      console.log('Applying client-specific iptables rules...');

      // Fetch all clients from database
      const clients = await Database.clients.getAll();

      // Flush existing FORWARD chain rules
      await exec('iptables -F FORWARD');
      if (!WG_ENV.DISABLE_IPV6) {
        await exec('ip6tables -F FORWARD');
      }

      // Set default FORWARD policy to DROP (block all traffic by default)
      await exec('iptables -P FORWARD DROP');
      if (!WG_ENV.DISABLE_IPV6) {
        await exec('ip6tables -P FORWARD DROP');
      }

      // Generate and apply rules for each enabled client
      const includedClients: string[] = [];
      for (const client of clients) {
        if (!client.enabled) {
          console.log(`Skipping disabled client: ${client.name}`);
          continue;
        }
        const rules = generateClientIptablesRules(client);
        for (const rule of rules) {
          await exec(rule);
        }

        includedClients.push(client.name);
        console.log(`Applied rules for client: ${client.name}`);
      }

      console.log(
        `Applied rules for ${includedClients.length} enabled clients: ${includedClients.join(', ')}`
      );
    } catch (error) {
      console.error('Error applying client iptables rules:', error);
    }
  };

  /**
   * Removes FORWARD chain rules from hook commands.
   *
   * @param rule - The hook rule string
   * @returns Filtered rule string without FORWARD rules
   */
  const remove_forward_rule = async (rule: string) => {
    try {
      const filteredRules = rule.split(';').filter((line) => {
        return !/FORWARD/i.test(line);
      });
      return filteredRules.join(';');
    } catch (error) {
      console.error('Error removing default FORWARD rule:', error);
    }
    return rule;
  };

  /**
   * Initializes traffic restriction by removing default FORWARD allow rules
   * from hook commands.
   */
  const initializeTrafficRestriction = async () => {
    try {
      const hooks = await Database.hooks.get();

      // Remove default FORWARD allow rules from hooks
      const updatedHooks = {
        ...hooks,
        postUp: await remove_forward_rule(hooks.postUp),
        postDown: await remove_forward_rule(hooks.postDown),
      };

      // Update hooks in database
      await Database.hooks.update(updatedHooks);
      console.log('Removed default FORWARD rules from hooks');
    } catch (error) {
      console.error('Error initializing traffic restriction:', error);
    }
  };

  // Register event listeners for wireguard lifecycle hooks
  nitroApp.hooks.hook('wireguard:config', applyClientIptablesRules);
  nitroApp.hooks.hook('wireguard:start', async () => {
    await initializeTrafficRestriction();
    await applyClientIptablesRules();
  });
});
