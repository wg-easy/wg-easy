import { createError } from 'nuxt/server';
import { parseCidr } from 'cidr-tools';

import { peerAllowedIps, type ServerPeer } from './configuration';
import {
  preferredRoute,
  matchesOwnedRoute,
  routeMetric,
  kernelTable,
  routeProtocol,
  routingTable,
  type KernelRoute,
} from './linuxRouting';

import { exec } from '#server/utils/cmd';
import { normalizePrefix } from '#server/utils/ip';
import { parseInterfaceName } from '#server/utils/interfaceName';
import type { InterfaceType } from '#db/repositories/interface/types';

type SiteRoute = { prefix: string; table: number };
function routeKey({ prefix, table }: SiteRoute) {
  return `${table}/${prefix}`;
}

class RouteConflict extends Error {}

// Index by prefix length and network number so a peer lookup examines at
// most 32 or 128 lengths, independent of the number of peers or host routes.
class RouteTable {
  private readonly byLength = new Map<number, Map<bigint, KernelRoute[]>>();

  constructor(private readonly addressBits: number) {}

  add(route: KernelRoute) {
    const { start, prefix } = parseCidr(route.dst);
    const length = Number(prefix);
    let networks = this.byLength.get(length);
    if (!networks) {
      networks = new Map();
      this.byLength.set(length, networks);
    }
    const key = start >> BigInt(this.addressBits - length);
    const entries = networks.get(key);
    if (entries) {
      entries.push(route);
    } else {
      networks.set(key, [route]);
    }
  }

  matching(value: string) {
    const { start, prefix } = parseCidr(value);
    const wanted = Number(prefix);
    for (let length = wanted; length >= 0; length--) {
      const entries = this.byLength
        .get(length)
        ?.get(start >> BigInt(this.addressBits - length));
      if (entries) {
        return { exact: length === wanted, entries };
      }
    }
    return { exact: false, entries: [] };
  }
}

async function readTable(ipv6: boolean, table: number, match?: string) {
  const routes = new RouteTable(ipv6 ? 128 : 32);
  const ip = ipv6 ? 'ip -6' : 'ip -4';
  let output;
  try {
    output = await exec(
      `${ip} -N -j -details route show table ${table}${match ? ' match ' + match : ''}`,
      { maxBuffer: 16 * 1024 * 1024 }
    );
  } catch (error) {
    // A numeric table need not exist before adding its first route.
    if (
      error instanceof Error &&
      error.message.includes('FIB table does not exist')
    ) {
      return routes;
    }
    throw error;
  }
  for (const route of JSON.parse(output || '[]') as KernelRoute[]) {
    if (
      route.dst !== 'default' &&
      (route.table === undefined || kernelTable(route.table) === table)
    ) {
      routes.add(route);
    }
  }
  return routes;
}

function siteRoutesForPeers(
  setting: string,
  clients: ServerPeer[],
  enableIpv6: boolean
) {
  const sites = new Map<string, SiteRoute>();
  if (setting === 'off') {
    return sites;
  }
  const table = routingTable(setting);
  for (const client of clients) {
    if (!client.enabled) {
      continue;
    }
    for (const value of peerAllowedIps(client, enableIpv6)) {
      const prefix = normalizePrefix(value);
      if (!prefix.endsWith('/0')) {
        const route = { prefix, table };
        sites.set(routeKey(route), route);
      }
    }
  }
  return sites;
}

export class SiteRoutes {
  // A matching route on wg0 alone is insufficient proof of ownership.
  private owned = new Map<string, SiteRoute>();

  async sync(
    network: InterfaceType,
    clients: ServerPeer[],
    enableIpv6: boolean
  ) {
    const desired = siteRoutesForPeers(
      network.routingTable,
      clients,
      enableIpv6
    );
    const device = parseInterfaceName(network.name);
    const tables = new Map<string, Promise<RouteTable | undefined>>();

    async function tableForInstall(
      ipv6: boolean,
      { table, prefix }: SiteRoute
    ) {
      const key = `${ipv6 ? 6 : 4}/${table}`;
      let snapshot = tables.get(key);
      if (!snapshot) {
        snapshot = readTable(ipv6, table).catch((error) => {
          // Large tables fall back to a bounded read per prefix.
          if (error.code !== 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
            throw error;
          }
          return undefined;
        });
        tables.set(key, snapshot);
      }
      return (await snapshot) ?? readTable(ipv6, table, prefix);
    }

    let failure;
    // Process each prefix even if another client has a conflicting route.
    // Withdraw obsolete routes first so they cannot mask a still-needed subnet.
    const obsolete = [...this.owned].filter(([key]) => !desired.has(key));
    for (const [key, route] of [...obsolete, ...desired]) {
      const action = desired.has(key) ? 'install' : 'remove';
      try {
        const ipv6 = route.prefix.includes(':');
        // Verify removals against the live prefix. Snapshot the table only
        // after all withdrawals, so installs see the remaining routes.
        const routes =
          action === 'remove'
            ? await readTable(ipv6, route.table, route.prefix)
            : await tableForInstall(ipv6, route);
        await this.applyRoute(
          device,
          route,
          action,
          network.routingTable === 'auto',
          routes
        );
      } catch (cause) {
        const conflict = cause instanceof RouteConflict;
        failure ??= createError({
          status: conflict ? 409 : 500,
          statusText: 'Site route update failed',
          message: `Settings saved. Could not ${action} ${route.prefix} on ${device} in table ${route.table}. ${conflict ? 'An existing route conflicts with this subnet. ' : ''}Maintenance will retry.`,
          cause,
        });
      }
    }
    return failure;
  }

  private async applyRoute(
    device: string,
    route: SiteRoute,
    action: 'install' | 'remove',
    automatic: boolean,
    routes: RouteTable
  ) {
    const { prefix, table } = route;
    const key = routeKey(route);
    const ipv6 = prefix.includes(':');
    const ip = ipv6 ? 'ip -6' : 'ip -4';
    const { exact, entries } = routes.matching(prefix);
    const family = ipv6 ? 'ipv6' : 'ipv4';
    const metric = routeMetric(family);
    const installed =
      this.owned.has(key) &&
      exact &&
      entries.some((entry) => matchesOwnedRoute(entry, device, family));
    const target = `${prefix} dev ${device} table ${table}`;
    if (action === 'remove') {
      if (installed) {
        await exec(
          `${ip} route del ${target} proto ${routeProtocol} metric ${metric}`
        );
      }
      this.owned.delete(key);
      return;
    }
    if (!installed) {
      this.owned.delete(key);
    }
    // Linux selects the longest prefix first, then the lowest metric.
    const preferred = preferredRoute(entries, device);
    if ((exact || automatic) && preferred.viaTunnel) {
      return;
    }
    if (exact && preferred.metric <= metric) {
      throw new RouteConflict();
    }
    await exec(`${ip} route add ${target} proto ${routeProtocol}`);
    routes.add({
      dst: prefix,
      dev: device,
      protocol: routeProtocol,
      metric,
      scope: ipv6 ? 0 : 253,
    });
    this.owned.set(key, route);
  }
}
