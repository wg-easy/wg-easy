import { createError } from 'nuxt/server';
import { parseCidr } from 'cidr-tools';
import { stringifyIp } from 'ip-bigint';

import { exec } from '#server/utils/cmd';
import { parseInterfaceName } from '#server/utils/interfaceName';
import type { ClientType } from '#db/repositories/client/types';
import type { InterfaceType } from '#db/repositories/interface/types';

type SiteRoute = { prefix: string; table: number };
type InstalledRoute = SiteRoute & { protocol: number };
type RouteClient = Pick<
  ClientType,
  'enabled' | 'serverAllowedIps' | 'ipv4Address' | 'ipv6Address'
>;
type Startup = { trace: string; postUp: string };
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
const bootProtocol = 3;

function routeKey({ prefix, table }: SiteRoute) {
  return `${table}/${prefix}`;
}

function canonicalPrefix(value: string) {
  if (value.includes('%')) {
    throw new Error('Site routes cannot include an IPv6 zone ID');
  }
  // Always use the network address and an explicit mask, even for host routes.
  const { start, version, prefix } = parseCidr(value);
  return `${stringifyIp({ number: start, version }, { hexify: true })}/${prefix}`;
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
    network: InterfaceType,
    clients: RouteClient[],
    enableIpv6: boolean,
    startup?: Startup
  ) {
    const device = parseInterfaceName(network.name);
    if (startup) {
      this.owned.clear();
    }
    const desired = this.desiredRoutes(
      network.routingTable,
      clients,
      enableIpv6
    );
    if (startup && desired.size) {
      this.recordStartupRoutes(device, desired, startup);
    }

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
    if (failure) {
      throw failure;
    }
  }

  private desiredRoutes(
    setting: string,
    clients: RouteClient[],
    enableIpv6: boolean
  ) {
    const desired = new Map<string, SiteRoute>();
    const enabled = clients.filter((client) => client.enabled);
    const sites = new Set(
      enabled.flatMap((client) => client.serverAllowedIps ?? [])
    );
    if (setting === 'off' || (!sites.size && !this.owned.size)) {
      return desired;
    }
    const table = routingTable(setting);
    // An enabled peer's tunnel address can keep an existing site route alive.
    const addresses = this.owned.size
      ? enabled.flatMap((client) => [client.ipv4Address, client.ipv6Address])
      : [];
    for (const value of [...sites, ...addresses]) {
      if (!enableIpv6 && value.includes(':')) {
        continue;
      }
      const prefix = canonicalPrefix(value);
      const route = { prefix, table };
      const key = routeKey(route);
      if (!prefix.endsWith('/0') && (sites.has(value) || this.owned.has(key))) {
        desired.set(key, route);
      }
    }
    return desired;
  }

  private recordStartupRoutes(
    device: string,
    desired: Map<string, SiteRoute>,
    startup: Startup
  ) {
    // wg-quick reports each route it actually added. Exclude user hooks and
    // skipped/connected routes, even when they exactly match a desired prefix.
    const lines = startup.trace.split('\n');
    const up = lines.findIndex(
      (line) =>
        /^\[#\] ip link set mtu \d+ up dev /.test(line) &&
        line.endsWith(` dev ${device}`)
    );
    if (up < 0) {
      return;
    }
    const postUp = `[#] ${startup.postUp.trim().replaceAll('%i', device)}`;
    for (const line of lines.slice(up + 1)) {
      if (line === postUp) {
        break;
      }
      const [, destination, dev, table = 'auto'] =
        /^\[#\] ip -[46] route add ([\da-f.:/]+) dev ([\w=+.-]+)(?: table (\d+))?$/.exec(
          line
        ) ?? [];
      if (!destination || dev !== device) {
        continue;
      }
      const key = routeKey({
        prefix: canonicalPrefix(destination),
        table: routingTable(table),
      });
      const route = desired.get(key);
      if (route) {
        this.owned.set(key, { ...route, protocol: bootProtocol });
      }
    }
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
    const owned = this.owned.get(key);
    const metric = ipv6 ? 1024 : 0;
    const installed =
      owned &&
      exact.some(
        (entry) =>
          direct(entry) &&
          Number(entry.protocol) === owned.protocol &&
          (entry.metric ?? 0) === metric
      );
    if (!installed) {
      this.owned.delete(key);
    }
    const target = `${prefix} dev ${device} table ${table}`;
    if (action === 'remove') {
      if (installed) {
        await exec(
          `${ip} route del ${target} proto ${owned.protocol} metric ${metric}`
        );
        this.owned.delete(key);
      }
      return;
    }
    if (exact.length) {
      if (!exact.every(direct)) {
        throw new RouteConflict();
      }
      return;
    }
    const best = byLength.get(Math.max(...byLength.keys()));
    if (automatic && best?.every(direct)) {
      return;
    }
    await exec(`${ip} route add ${target} proto ${siteProtocol}`);
    this.owned.set(key, { ...route, protocol: siteProtocol });
  }
}
