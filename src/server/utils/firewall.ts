import debug from 'debug';
import { isIPv6 } from 'is-ip';

import { exec } from './cmd';
import type { ClientType } from '#db/repositories/client/types';
import type { InterfaceType } from '#db/repositories/interface/types';
import type { UserConfigType } from '#db/repositories/userConfig/types';

const FW_DEBUG = debug('Firewall');
const CHAIN_NAME = 'WG_CLIENTS';

// Mutex to prevent concurrent rule rebuilds
let rebuildInProgress = false;
let rebuildQueued = false;

// Cache iptables availability check result
let iptablesAvailable: boolean | null = null;

type ParsedEntry = {
  ip: string;
  port?: number;
  proto?: 'tcp' | 'udp' | 'both';
};

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
    if (match) {
      return { ip: match[1], port: parseInt(match[2], 10), proto: proto ?? 'both' };
    }
    // Just bracketed IPv6 without port
    const ipMatch = remaining.match(/^\[(.+)\]$/);
    if (ipMatch) {
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
  clientIp: string,
  entry: ParsedEntry,
  action: 'A' | 'D' = 'A'
): string[] {
  const rules: string[] = [];
  const baseArgs = `-${action} ${CHAIN_NAME} -s ${clientIp} -d ${entry.ip}`;

  if (entry.port) {
    // Port-specific rules
    if (entry.proto === 'tcp' || entry.proto === 'both') {
      rules.push(`${baseArgs} -p tcp --dport ${entry.port} -j ACCEPT`);
    }
    if (entry.proto === 'udp' || entry.proto === 'both') {
      rules.push(`${baseArgs} -p udp --dport ${entry.port} -j ACCEPT`);
    }
  } else {
    // No port - allow all traffic to destination
    rules.push(`${baseArgs} -j ACCEPT`);
  }

  return rules;
}

export const firewall = {
  /**
   * Initialize the custom chain if it doesn't exist
   */
  async initChain(interfaceName: string): Promise<void> {
    FW_DEBUG(`Initializing firewall chain ${CHAIN_NAME} for interface ${interfaceName}`);

    // Create chain if not exists (iptables returns error if exists, so we ignore)
    await exec(`iptables -N ${CHAIN_NAME} 2>/dev/null || true`);
    await exec(`ip6tables -N ${CHAIN_NAME} 2>/dev/null || true`);

    // Ensure chain is referenced from FORWARD (if not already)
    // Insert at position 1 to process before generic ACCEPT rules
    await exec(
      `iptables -C FORWARD -i ${interfaceName} -j ${CHAIN_NAME} 2>/dev/null || iptables -I FORWARD 1 -i ${interfaceName} -j ${CHAIN_NAME}`
    );
    await exec(
      `ip6tables -C FORWARD -i ${interfaceName} -j ${CHAIN_NAME} 2>/dev/null || ip6tables -I FORWARD 1 -i ${interfaceName} -j ${CHAIN_NAME}`
    );
  },

  /**
   * Flush all rules in the custom chain
   */
  async flushChain(): Promise<void> {
    FW_DEBUG(`Flushing firewall chain ${CHAIN_NAME}`);
    await exec(`iptables -F ${CHAIN_NAME} 2>/dev/null || true`);
    await exec(`ip6tables -F ${CHAIN_NAME} 2>/dev/null || true`);
  },

  /**
   * Apply firewall rules for a single client
   */
  async applyClientRules(
    client: ClientType,
    defaultAllowedIps: string[],
    enableIpv6: boolean
  ): Promise<void> {
    // Determine which IPs to use for firewall rules
    // Priority: firewallIps > allowedIps > defaultAllowedIps
    const effectiveIps =
      client.firewallIps && client.firewallIps.length > 0
        ? client.firewallIps
        : client.allowedIps ?? defaultAllowedIps;

    FW_DEBUG(
      `Applying firewall rules for client ${client.name} (${client.id}): ${effectiveIps.join(', ')}`
    );

    for (const ipEntry of effectiveIps) {
      const parsed = parseFirewallEntry(ipEntry);
      const destIsIpv6 = isIPv6(parsed.ip.split('/')[0]); // Handle CIDR by checking base IP

      if (destIsIpv6) {
        if (enableIpv6) {
          const rules = generateRuleArgs(client.ipv6Address, parsed);
          for (const rule of rules) {
            await exec(`ip6tables ${rule}`);
          }
        }
      } else {
        const rules = generateRuleArgs(client.ipv4Address, parsed);
        for (const rule of rules) {
          await exec(`iptables ${rule}`);
        }
      }
    }
  },

  /**
   * Full rebuild of firewall rules from database state
   */
  async rebuildRules(
    wgInterface: InterfaceType,
    clients: ClientType[],
    userConfig: UserConfigType,
    enableIpv6: boolean
  ): Promise<void> {
    if (!wgInterface.firewallEnabled) {
      FW_DEBUG('Firewall filtering disabled, removing any existing rules');
      await this.removeFiltering(wgInterface.name);
      return;
    }

    // Handle concurrent rebuilds with queue
    if (rebuildInProgress) {
      FW_DEBUG('Rebuild already in progress, queuing');
      rebuildQueued = true;
      return;
    }

    rebuildInProgress = true;

    try {
      FW_DEBUG('Rebuilding firewall rules...');

      // Initialize chain structure
      await this.initChain(wgInterface.name);

      // Flush existing rules
      await this.flushChain();

      // Apply rules for each enabled client
      for (const client of clients) {
        if (!client.enabled) continue;
        await this.applyClientRules(client, userConfig.defaultAllowedIps, enableIpv6);
      }

      // Add final DROP for any traffic not explicitly allowed
      await exec(`iptables -A ${CHAIN_NAME} -j DROP`);
      if (enableIpv6) {
        await exec(`ip6tables -A ${CHAIN_NAME} -j DROP`);
      }

      FW_DEBUG('Firewall rules rebuilt successfully');
    } finally {
      rebuildInProgress = false;

      // If another rebuild was queued, run it now
      if (rebuildQueued) {
        rebuildQueued = false;
        FW_DEBUG('Processing queued rebuild');
        await this.rebuildRules(wgInterface, clients, userConfig, enableIpv6);
      }
    }
  },

  /**
   * Remove all firewall filtering (when feature is disabled)
   */
  async removeFiltering(interfaceName: string): Promise<void> {
    FW_DEBUG(`Removing firewall filtering for interface ${interfaceName}`);

    // Remove jump rules from FORWARD chain
    await exec(
      `iptables -D FORWARD -i ${interfaceName} -j ${CHAIN_NAME} 2>/dev/null || true`
    );
    await exec(
      `ip6tables -D FORWARD -i ${interfaceName} -j ${CHAIN_NAME} 2>/dev/null || true`
    );

    // Flush and delete the chain
    await exec(`iptables -F ${CHAIN_NAME} 2>/dev/null || true`);
    await exec(`ip6tables -F ${CHAIN_NAME} 2>/dev/null || true`);
    await exec(`iptables -X ${CHAIN_NAME} 2>/dev/null || true`);
    await exec(`ip6tables -X ${CHAIN_NAME} 2>/dev/null || true`);
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
