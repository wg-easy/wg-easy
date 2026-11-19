import { createError } from 'nuxt/server';
import { normalizeCidr, parseCidr } from 'cidr-tools';

import { exec } from '#server/utils/cmd';
import { parseInterfaceName } from '#server/utils/interfaceName';
import type { ClientType } from '#db/repositories/client/types';
import type { InterfaceType } from '#db/repositories/interface/types';

type RouteClient = Pick<
  ClientType,
  'enabled' | 'serverAllowedIps' | 'ipv4Address' | 'ipv6Address'
>;
type Network = Pick<InterfaceType, 'name' | 'routingTable'>;
type SiteRoute = { prefix: string; table: number };
type InstalledRoute = SiteRoute & { protocol: number };
type KernelRoute = {
  dst: string;
  dev?: string;
  gateway?: string;
  table: string;
  type: string;
  protocol: string;
  metric?: number;
};

// An application-specific Linux route protocol distinguishes live additions from
// admin routes. wg-quick creates its ordinary routes with RTPROT_BOOT (3).
const siteProtocol = 242;

function routeKey({ prefix, table }: SiteRoute) {
  return `${table}/${prefix}`;
}

function family(prefix: string) {
  return prefix.includes(':') ? '-6' : '-4';
}

function ordinaryPrefix(value: string) {
  const prefix = normalizeCidr(value, { hexify: true });
  // Only canonical IP literals reach iproute2, including for imported records.
  if (!/^[a-f0-9.:]+(?:\/\d+)?$/.test(prefix)) {
    throw new Error('Invalid site prefix');
  }
  return prefix.endsWith('/0') ? undefined : prefix;
}

function routingTable(setting: string) {
  if (setting === 'auto') {
    return 254;
  }
  // iproute2 reads a leading zero as octal and table zero as the main table.
  const id = Number(setting.startsWith('0') ? `0o${setting}` : setting);
  if (!/^\d+$/.test(setting) || !Number.isSafeInteger(id) || id > 0xffffffff) {
    throw new Error('Invalid Linux routing table');
  }
  return id || 254;
}

class RouteConflict extends Error {}

export class SiteRoutes {
  // A matching route on wg0 alone is insufficient proof of ownership.
  private owned = new Map<string, InstalledRoute>();

  async sync(
    network: Network,
    clients: RouteClient[],
    enableIpv6: boolean,
    startup?: { trace: string; postUp: string }
  ) {
    const device = parseInterfaceName(network.name);
    if (startup) {
      this.owned.clear();
    }
    const enabled = clients.filter((client) => client.enabled);
    if (
      !this.owned.size &&
      (network.routingTable === 'off' ||
        !enabled.some((client) => client.serverAllowedIps?.length))
    ) {
      return;
    }
    const desired = new Map<string, SiteRoute>();
    const peerAddresses = new Set<string>();
    if (network.routingTable !== 'off') {
      const table = routingTable(network.routingTable);
      for (const client of enabled) {
        peerAddresses.add(
          routeKey({ table, prefix: normalizeCidr(client.ipv4Address) })
        );
        if (enableIpv6) {
          peerAddresses.add(
            routeKey({
              table,
              prefix: normalizeCidr(client.ipv6Address, { hexify: true }),
            })
          );
        }
        for (const value of client.serverAllowedIps ?? []) {
          const prefix = ordinaryPrefix(value);
          if (prefix && (enableIpv6 || family(prefix) === '-4')) {
            const route = { prefix, table };
            desired.set(routeKey(route), route);
          }
        }
      }
    }

    if (startup) {
      this.recordStartupRoutes(device, desired, startup);
    }

    let failure;
    // Process each prefix even if another client has a conflicting route.
    // Withdraw obsolete routes first so they cannot mask a still-needed subnet.
    for (const [key, route] of this.owned) {
      if (peerAddresses.has(key)) {
        desired.set(key, route);
      }
    }
    const obsolete = [...this.owned].filter(([key]) => !desired.has(key));
    for (const [key, route] of [...obsolete, ...desired]) {
      const keep = desired.has(key);
      try {
        await this.applyRoute(
          device,
          route,
          keep,
          network.routingTable === 'auto'
        );
      } catch (cause) {
        failure ??= createError({
          status: cause instanceof RouteConflict ? 409 : 500,
          statusText: 'Site route update failed',
          message: `Settings saved. Could not ${keep ? 'install' : 'remove'} ${route.prefix} on ${device} in table ${route.table}. ${cause instanceof RouteConflict ? 'An existing route conflicts with this subnet. ' : ''}Maintenance will retry.`,
          cause,
        });
      }
    }
    if (failure) {
      throw failure;
    }
  }

  private recordStartupRoutes(
    device: string,
    desired: Map<string, SiteRoute>,
    startup: { trace: string; postUp: string }
  ) {
    // wg-quick reports each route it actually added. Exclude user hooks and
    // skipped/connected routes, even when they exactly match a desired prefix.
    let addingRoutes = false;
    for (const line of startup.trace.split('\n')) {
      if (
        /^\[#\] ip link set mtu \d+ up dev /.test(line) &&
        line.endsWith(` dev ${device}`)
      ) {
        addingRoutes = true;
      }
      if (!addingRoutes) {
        continue;
      }
      if (line === `[#] ${startup.postUp.trim().replaceAll('%i', device)}`) {
        break;
      }
      const match =
        /^\[#\] ip -[46] route add ([\da-f.:/]+) dev ([\w=+.-]+)(?: table (\d+))?$/.exec(
          line
        );
      if (match && match[2] === device) {
        const key = routeKey({
          prefix: normalizeCidr(match[1]!, { hexify: true }),
          table: routingTable(match[3] ?? 'auto'),
        });
        const route = desired.get(key);
        if (route) {
          this.owned.set(key, { ...route, protocol: 3 });
        }
      }
    }
  }

  private async applyRoute(
    device: string,
    route: SiteRoute,
    keep: boolean,
    automatic: boolean
  ) {
    const { prefix, table } = route;
    const key = routeKey(route);
    // Query all tables because an unused numeric table does not exist yet.
    const ip = `ip ${family(prefix)}`;
    const output = await exec(
      `${ip} -N -j -details route show table all match ${prefix}`
    );
    const matching = (JSON.parse(output || '[]') as KernelRoute[]).filter(
      (entry) => Number(entry.table) === table && entry.dst !== 'default'
    );
    const entries = matching.filter(
      (entry) => normalizeCidr(entry.dst, { hexify: true }) === prefix
    );
    const direct = (entry: KernelRoute) =>
      entry.dev === device && entry.type === '1' && !entry.gateway;
    const owned = this.owned.get(key);
    const metric = family(prefix) === '-6' ? 1024 : 0;
    const installed =
      owned &&
      entries.some(
        (entry) =>
          direct(entry) &&
          Number(entry.protocol) === owned.protocol &&
          (entry.metric ?? 0) === metric
      );
    if (!installed) {
      this.owned.delete(key);
    }
    const target = `${prefix} dev ${device} table ${table}`;
    if (!keep && installed) {
      await exec(
        `${ip} route del ${target} proto ${owned.protocol} metric ${metric}`
      );
      this.owned.delete(key);
    }
    if (keep && entries.some((entry) => !direct(entry))) {
      throw new RouteConflict();
    }
    if (keep && entries.length === 0) {
      if (automatic && matching.length) {
        // A connected or manually installed covering route can already send
        // this subnet to wg0. Only the most specific covering prefix matters.
        const lengths = matching.map((entry) =>
          Number(parseCidr(entry.dst).prefix)
        );
        const longest = Math.max(...lengths);
        if (
          matching.every(
            (entry, index) => lengths[index] !== longest || direct(entry)
          )
        ) {
          return;
        }
      }
      await exec(`${ip} route add ${target} proto ${siteProtocol}`);
      this.owned.set(key, { ...route, protocol: siteProtocol });
    }
  }
}
