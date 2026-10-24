import { isIP, isIPv6 } from 'is-ip';
import isCidr from 'is-cidr';

import type { ClientType } from '#db/repositories/client/types';

type RouteClient = Pick<ClientType, 'enabled' | 'serverAllowedIps'>;

/**
 * Routes `wg-quick up` would add for the Server Allowed IPs of all enabled clients
 *
 * Default routes (/0) are left out as `wg-quick` handles them with policy routing
 */
export function desiredServerRoutes(
  clients: RouteClient[],
  enableIpv6: boolean
) {
  const routes = new Set<string>();

  for (const client of clients) {
    if (!client.enabled) {
      continue;
    }
    for (const cidr of client.serverAllowedIps ?? []) {
      // entries end up in a shell command, only accept a plain IP or CIDR
      if (!isIP(cidr) && isCidr(cidr) === 0) {
        continue;
      }
      if (cidr.endsWith('/0')) {
        continue;
      }
      if (!enableIpv6 && isIPv6(cidr.split('/')[0]!)) {
        continue;
      }
      routes.add(cidr);
    }
  }

  return routes;
}

export function diffRoutes(previous: Set<string>, desired: Set<string>) {
  return {
    add: [...desired].filter((cidr) => !previous.has(cidr)),
    remove: [...previous].filter((cidr) => !desired.has(cidr)),
  };
}

/**
 * Builds the `ip route` command for a route on the WireGuard interface
 *
 * Returns null if routes are not managed (Table = off)
 */
export function routeCommand(
  action: 'replace' | 'del',
  cidr: string,
  infName: string,
  routingTable: string
) {
  if (routingTable === 'off') {
    return null;
  }

  const family = isIPv6(cidr.split('/')[0]!) ? '-6' : '-4';
  const table = routingTable === 'auto' ? '' : ` table ${routingTable}`;

  return `ip ${family} route ${action} ${cidr} dev ${infName}${table}`;
}
