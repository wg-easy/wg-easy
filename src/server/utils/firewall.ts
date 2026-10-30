import { createDebug } from 'obug';
import { isIPv6 } from 'is-ip';

import { exec } from '#server/utils/cmd';
import type { ClientType } from '#db/repositories/client/types';
import type { InterfaceType } from '#db/repositories/interface/types';
import type { UserConfigType } from '#db/repositories/userConfig/types';

const FW_DEBUG = createDebug('Firewall');
const CHAIN_NAME = 'WG_CLIENTS';

/**
 * Tie chains to a specific interface
 * Prevents instances in the same network namespace from wiping each other's rules
 */
function chainName(interfaceName: string) {
  return `${CHAIN_NAME}_${interfaceName}`;
}

// Each caller waits for its own snapshot, including disabling filtering.
let pendingRebuild: Promise<void> = Promise.resolve();

function commands(enableIpv6: boolean) {
  return enableIpv6 ? ['iptables', 'ip6tables'] : ['iptables'];
}

const trafficChains = ['FORWARD', 'INPUT'] as const;

function rebuildGuard(interfaceName: string) {
  return `-i ${interfaceName} -m comment --comment "wg-easy rebuild ${interfaceName}" -j DROP`;
}

async function blockDuringRebuild(interfaceName: string, enableIpv6: boolean) {
  const guard = rebuildGuard(interfaceName);
  for (const command of commands(enableIpv6)) {
    for (const chain of trafficChains) {
      const rules = (await exec(`${command} -S ${chain}`))
        .split('\n')
        .filter((rule) => rule.startsWith(`-A ${chain} `));
      // A guard below an ACCEPT or a jump to an old chain does not block
      // traffic. This also repairs guards left by older failed rebuilds.
      if (rules[0] !== `-A ${chain} ${guard}`)
        await exec(`${command} -I ${chain} 1 ${guard}`);
    }
  }
}

async function finishRebuild(interfaceName: string, enableIpv6: boolean) {
  for (const command of commands(enableIpv6)) {
    for (const chain of trafficChains) {
      const guard = rebuildGuard(interfaceName);
      const rules = (await exec(`${command} -S ${chain}`)).split('\n');
      // Remove all copies, including an older misplaced guard. Failure leaves
      // the remaining guards in place and the lifecycle retries the update.
      for (const rule of rules) {
        if (rule === `-A ${chain} ${guard}`)
          await exec(`${command} -D ${chain} ${guard}`);
      }
    }
  }
}

// Cache iptables availability check result
let iptablesAvailable: boolean | null = null;

type ParsedEntry = {
  ip: string;
  port?: number;
  proto?: 'tcp' | 'udp' | 'both';
};

type FirewallClient = Pick<
  ClientType,
  | 'id'
  | 'name'
  | 'ipv4Address'
  | 'ipv6Address'
  | 'allowedIps'
  | 'firewallIps'
  | 'enabled'
>;

/**
 * Sanitize a client identifier for use in an iptables comment.
 * Strips all characters except ASCII alphanumeric, space, underscore, hyphen, and dot.
 * Combines with client ID for a safe, identifiable comment.
 * Truncates to 256 bytes (iptables comment module limit).
 */
function sanitizeComment(clientId: number, clientName: string): string {
  const safe = clientName.replace(/[^a-zA-Z0-9 _.-]/g, '');
  const comment = `client ${clientId}: ${safe}`;
  return comment.slice(0, 256);
}

/**
 * Parse a firewall entry string into its components.
 * Supports formats:
 * - IP: "10.0.0.1" or "2001:db8::1"
 * - CIDR: "10.0.0.0/24" or "2001:db8::/32"
 * - IP:port: "10.0.0.1:443" or "[2001:db8::1]:443"
 * - IP:port/proto: "10.0.0.1:443/tcp" or "10.0.0.1:53/udp"
 * - CIDR:port: "10.0.0.0/24:443"
 * - CIDR:port/proto: "10.0.0.0/24:443/tcp" or "10.0.0.0/24:53/udp"
 *
 * Note: Protocol (/tcp or /udp) requires a port. "IP/tcp" or "CIDR/tcp" without
 * a port is invalid and will throw an error.
 *
 * @throws {Error} If protocol is specified without a port
 */
function parseFirewallEntry(entry: string): ParsedEntry {
  entry = entry.replace(/\/(tcp|udp)$/i, (suffix) => suffix.toLowerCase());
  // Extract protocol suffix first: /tcp or /udp
  let proto: 'tcp' | 'udp' | 'both' | undefined;
  let remaining = entry;

  if (entry.endsWith('/tcp')) {
    proto = 'tcp';
    remaining = entry.slice(0, -4);
  } else if (entry.endsWith('/udp')) {
    proto = 'udp';
    remaining = entry.slice(0, -4);
  }

  // Handle IPv6 with port: [2001:db8::1]:443
  if (remaining.startsWith('[')) {
    const match = remaining.match(/^\[(.+)\]:(\d+)$/);
    if (match && match[1] && match[2]) {
      return {
        ip: match[1],
        port: parseInt(match[2], 10),
        proto: proto ?? 'both',
      };
    }
    // Just bracketed IPv6 without port
    const ipMatch = remaining.match(/^\[(.+)\]$/);
    if (ipMatch && ipMatch[1]) {
      if (proto) {
        throw new Error(
          `Invalid firewall entry "${entry}": Protocol (/${proto}) requires a port. Use format like "[${ipMatch[1]}]:443/${proto}"`
        );
      }
      return { ip: ipMatch[1] };
    }
    if (proto) {
      throw new Error(
        `Invalid firewall entry "${entry}": Protocol (/${proto}) requires a port`
      );
    }
    return { ip: remaining };
  }

  // Handle IPv4 with port or CIDR with port
  // Count colons to distinguish IPv6 from IPv4:port
  const colonCount = (remaining.match(/:/g) || []).length;

  if (colonCount === 1) {
    // Could be IPv4:port or CIDR:port
    const lastColon = remaining.lastIndexOf(':');
    const possiblePort = remaining.slice(lastColon + 1);
    if (/^\d+$/.test(possiblePort)) {
      return {
        ip: remaining.slice(0, lastColon),
        port: parseInt(possiblePort, 10),
        proto: proto ?? 'both',
      };
    }
  }

  // Plain IP or CIDR (IPv4 or IPv6)
  if (proto) {
    throw new Error(
      `Invalid firewall entry "${entry}": Protocol (/${proto}) requires a port. Use format like "${remaining}:443/${proto}"`
    );
  }
  return { ip: remaining };
}

/**
 * Generate iptables rule arguments for a single firewall entry
 */
function generateRuleArgs(
  interfaceName: string,
  clientIp: string,
  entry: ParsedEntry,
  comment?: string,
  action: 'A' | 'D' = 'A'
): string[] {
  const rules: string[] = [];
  const commentArg = comment ? ` -m comment --comment "${comment}"` : '';
  const baseArgs = `-${action} ${chainName(interfaceName)} -s ${clientIp} -d ${entry.ip}`;

  if (entry.port) {
    // Port-specific rules
    if (entry.proto === 'tcp' || entry.proto === 'both') {
      rules.push(
        `${baseArgs} -p tcp --dport ${entry.port}${commentArg} -j ACCEPT`
      );
    }
    if (entry.proto === 'udp' || entry.proto === 'both') {
      rules.push(
        `${baseArgs} -p udp --dport ${entry.port}${commentArg} -j ACCEPT`
      );
    }
  } else {
    // No port - allow all traffic to destination
    rules.push(`${baseArgs}${commentArg} -j ACCEPT`);
  }

  return rules;
}

export const firewall = {
  /** Keep traffic blocked until the entire VPN update has succeeded. */
  blockTraffic: blockDuringRebuild,

  /**
   * Initialize the custom chain if it doesn't exist
   */
  async initChain(
    interfaceName: string,
    enableIpv6: boolean,
    attach = true,
    position = 1
  ): Promise<void> {
    const chain = chainName(interfaceName);
    FW_DEBUG(
      `Initializing firewall chain ${chain} for interface ${interfaceName}`
    );

    for (const command of commands(enableIpv6)) {
      // Ignore only an already existing chain, not an unavailable firewall.
      await exec(
        `${command} -N ${chain} 2>/dev/null || ${command} -S ${chain} >/dev/null`
      );
      if (!attach) continue;
      for (const parent of trafficChains) {
        await exec(
          `${command} -C ${parent} -i ${interfaceName} -j ${chain} 2>/dev/null || ${command} -I ${parent} ${position} -i ${interfaceName} -j ${chain}`
        );
      }
    }
  },

  /**
   * Flush all rules in the custom chain
   */
  async flushChain(interfaceName: string, enableIpv6: boolean): Promise<void> {
    const chain = chainName(interfaceName);
    FW_DEBUG(`Flushing firewall chain ${chain}`);
    for (const command of commands(enableIpv6)) {
      await exec(`${command} -F ${chain}`);
    }
  },

  /**
   * Apply firewall rules for a single client
   */
  async applyClientRules(
    interfaceName: string,
    client: FirewallClient,
    defaultAllowedIps: string[],
    enableIpv6: boolean
  ): Promise<void> {
    // Determine which IPs to use for firewall rules
    // Priority: firewallIps > allowedIps > defaultAllowedIps
    const effectiveIps =
      client.firewallIps && client.firewallIps.length > 0
        ? client.firewallIps
        : (client.allowedIps ?? defaultAllowedIps);

    FW_DEBUG(
      `Applying firewall rules for client ${client.name} (${client.id}): ${effectiveIps.join(', ')}`
    );

    const comment = sanitizeComment(client.id, client.name);

    for (const ipEntry of effectiveIps) {
      const parsed = parseFirewallEntry(ipEntry);
      const baseIp = parsed.ip.split('/')[0] ?? parsed.ip; // Handle CIDR by checking base IP
      const destIsIpv6 = isIPv6(baseIp);

      if (destIsIpv6) {
        if (enableIpv6) {
          const rules = generateRuleArgs(
            interfaceName,
            client.ipv6Address,
            parsed,
            comment
          );
          for (const rule of rules) {
            await exec(`ip6tables ${rule}`);
          }
        }
      } else {
        const rules = generateRuleArgs(
          interfaceName,
          client.ipv4Address,
          parsed,
          comment
        );
        for (const rule of rules) {
          await exec(`iptables ${rule}`);
        }
      }
    }
  },

  /**
   * Full rebuild of firewall rules from database state
   */
  rebuildRules(
    wgInterface: InterfaceType,
    clients: FirewallClient[],
    userConfig: UserConfigType,
    enableIpv6: boolean
  ): Promise<void> {
    const result = pendingRebuild.then(async () => {
      if (!wgInterface.firewallEnabled) {
        FW_DEBUG('Firewall filtering disabled, removing any existing rules');
        await this.removeFiltering(wgInterface.name, enableIpv6);
        return;
      }

      FW_DEBUG('Rebuilding firewall rules...');

      // Leave these guards installed on any failure. A retry or explicit
      // disable removes them only after the rules are safe to use.
      await blockDuringRebuild(wgInterface.name, enableIpv6);

      // Initialize chain structure
      // Attach new chains only once their rules are complete. Inserting a
      // jump above the guard earlier would expose a partially built chain.
      await this.initChain(wgInterface.name, enableIpv6, false);

      // Flush existing rules
      await this.flushChain(wgInterface.name, enableIpv6);

      // Apply rules for each enabled client
      for (const client of clients) {
        if (!client.enabled) continue;
        await this.applyClientRules(
          wgInterface.name,
          client,
          userConfig.defaultAllowedIps,
          enableIpv6
        );
      }

      // Add final DROP for any traffic not explicitly allowed
      const chain = chainName(wgInterface.name);
      await exec(`iptables -A ${chain} -j DROP`);
      if (enableIpv6) {
        await exec(`ip6tables -A ${chain} -j DROP`);
      }

      // Keep the DROP guard first, including if removing it later fails.
      await this.initChain(wgInterface.name, enableIpv6, true, 2);
      await finishRebuild(wgInterface.name, enableIpv6);
      FW_DEBUG('Firewall rules rebuilt successfully');
    });
    pendingRebuild = result.catch(() => {});
    return result;
  },

  /**
   * Remove all firewall filtering (when feature is disabled)
   */
  async removeFiltering(
    interfaceName: string,
    enableIpv6: boolean
  ): Promise<void> {
    const chain = chainName(interfaceName);
    FW_DEBUG(`Removing firewall filtering for interface ${interfaceName}`);

    // Remove jump rules from both forwarded and server-local traffic.
    // This disconnects the interface from the old shared chain, but it won't delete the chain itself.
    // Other wg-easy instances on the same host may still rely on it.
    for (const command of commands(enableIpv6)) {
      for (const parent of trafficChains) {
        await exec(
          `${command} -D ${parent} -i ${interfaceName} -j ${chain} 2>/dev/null || true`
        );
        await exec(
          `${command} -D ${parent} -i ${interfaceName} -j ${CHAIN_NAME} 2>/dev/null || true`
        );
      }
      await exec(`${command} -F ${chain} 2>/dev/null || true`);
      await exec(`${command} -X ${chain} 2>/dev/null || true`);
      for (const parent of trafficChains) {
        await exec(
          `while ${command} -C ${parent} ${rebuildGuard(interfaceName)} 2>/dev/null; do ${command} -D ${parent} ${rebuildGuard(interfaceName)} || exit 1; done`
        );
      }
    }
  },

  /**
   * Check if iptables (and optionally ip6tables) are available on the system.
   * @param enableIpv6 - If true, also check for ip6tables. Defaults to true.
   */
  async isAvailable(enableIpv6: boolean = true): Promise<boolean> {
    // Return cached result if we've already checked
    if (iptablesAvailable !== null) {
      return iptablesAvailable;
    }

    try {
      // Check for iptables (always required)
      await exec('iptables --version');
      FW_DEBUG('iptables is available');

      // Check for ip6tables (only if IPv6 is enabled)
      if (enableIpv6) {
        await exec('ip6tables --version');
        FW_DEBUG('ip6tables is available');
      } else {
        FW_DEBUG('IPv6 disabled, skipping ip6tables check');
      }

      iptablesAvailable = true;
      return true;
    } catch (error) {
      iptablesAvailable = false;
      FW_DEBUG('iptables/ip6tables is not available:', error);
      return false;
    }
  },

  /**
   * Clear the availability cache to force a re-check
   */
  clearAvailabilityCache(): void {
    iptablesAvailable = null;
  },
};

export const firewallTestExports = {
  parseFirewallEntry,
  generateRuleArgs,
  sanitizeComment,
};
