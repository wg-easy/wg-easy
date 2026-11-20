import { createError } from 'nuxt/server';
import { parseCidr } from 'cidr-tools';

import { managedSitePrefixes } from './configuration';

import { exec } from '#server/utils/cmd';
import { normalizePrefix } from '#server/utils/ip';
import { parseInterfaceName } from '#server/utils/interfaceName';
import type { ClientType } from '#db/repositories/client/types';
import type { InterfaceType } from '#db/repositories/interface/types';

type SiteRoute = { prefix: string; table: number };
type RouteClient = Pick<
  ClientType,
  'enabled' | 'serverAllowedIps' | 'ipv4Address' | 'ipv6Address'
>;
type KernelRoute = {
  dst: string;
  dev?: string;
  gateway?: string;
  table: string;
  type: string;
  protocol: string;
  metric?: number;
};

// Tag every site route installed by wg-easy, including during startup.
const siteProtocol = 242;

function routeKey({ prefix, table }: SiteRoute) {
  return `${table}/${prefix}`;
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
  private owned = new Map<string, SiteRoute>();

  async sync(
    network: InterfaceType,
    clients: RouteClient[],
    enableIpv6: boolean
  ) {
    const device = parseInterfaceName(network.name);
    const desired = this.desiredRoutes(
      network.routingTable,
      clients,
      enableIpv6
    );

    let failure;
    // Process each prefix even if another client has a conflicting route.
    // Withdraw obsolete routes first so they cannot mask a still-needed subnet.
    const obsolete = [...this.owned].filter(([key]) => !desired.has(key));
    for (const [key, route] of [...obsolete, ...desired]) {
      const action = desired.has(key) ? 'install' : 'remove';
      try {
        await this.applyRoute(
          device,
          route,
          action,
          network.routingTable === 'auto'
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

  private desiredRoutes(
    setting: string,
    clients: RouteClient[],
    enableIpv6: boolean
  ) {
    const desired = new Map<string, SiteRoute>();
    if (setting === 'off') {
      return desired;
    }
    const sites = managedSitePrefixes(clients, enableIpv6);
    if (!sites.size && !this.owned.size) {
      return desired;
    }
    const table = routingTable(setting);
    // An enabled peer's tunnel address can keep an existing site route alive.
    const addresses = this.owned.size
      ? clients
          .filter((client) => client.enabled)
          .flatMap((client) =>
            enableIpv6
              ? [client.ipv4Address, client.ipv6Address]
              : [client.ipv4Address]
          )
          .map(normalizePrefix)
      : [];
    for (const prefix of [...sites, ...addresses]) {
      const route = { prefix, table };
      const key = routeKey(route);
      if (sites.has(prefix) || this.owned.has(key)) {
        desired.set(key, route);
      }
    }
    return desired;
  }

  private async applyRoute(
    device: string,
    route: SiteRoute,
    action: 'install' | 'remove',
    automatic: boolean
  ) {
    const { prefix, table } = route;
    const key = routeKey(route);
    // Query all tables because an unused numeric table does not exist yet.
    const ipv6 = prefix.includes(':');
    const ip = ipv6 ? 'ip -6' : 'ip -4';
    const output = await exec(
      `${ip} -N -j -details route show table all match ${prefix}`
    );
    const matching = (JSON.parse(output || '[]') as KernelRoute[]).filter(
      (entry) => Number(entry.table) === table && entry.dst !== 'default'
    );
    // "match" returns only covering prefixes. Equal lengths are exact matches.
    const byLength = Map.groupBy(matching, (entry) =>
      Number(parseCidr(entry.dst).prefix)
    );
    const exact = byLength.get(Number(parseCidr(prefix).prefix)) ?? [];
    const direct = (entry: KernelRoute) =>
      entry.dev === device && entry.type === '1' && !entry.gateway;

    const metric = ipv6 ? 1024 : 0;
    const installed =
      this.owned.has(key) &&
      exact.some(
        (entry) =>
          direct(entry) &&
          Number(entry.protocol) === siteProtocol &&
          (entry.metric ?? 0) === metric
      );
    if (!installed) {
      this.owned.delete(key);
    }
    const target = `${prefix} dev ${device} table ${table}`;
    if (action === 'remove') {
      if (installed) {
        await exec(
          `${ip} route del ${target} proto ${siteProtocol} metric ${metric}`
        );
        this.owned.delete(key);
      }
      return;
    }
    // Linux selects the longest prefix first, then the lowest metric.
    const best = byLength.get(Math.max(...byLength.keys())) ?? [];
    const bestMetric = Math.min(...best.map((entry) => entry.metric ?? 0));
    const preferred = best.filter(
      (entry) => (entry.metric ?? 0) === bestMetric
    );
    if (
      preferred.length &&
      (exact.length || automatic) &&
      preferred.every(direct)
    ) {
      return;
    }
    if (exact.length && bestMetric <= metric) {
      throw new RouteConflict();
    }
    await exec(`${ip} route add ${target} proto ${siteProtocol}`);
    this.owned.set(key, route);
  }
}
