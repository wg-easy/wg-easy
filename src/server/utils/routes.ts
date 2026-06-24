import { parseCidr, containsCidr } from 'cidr-tools';
import { stringifyIp } from 'ip-bigint';
import { createDebug } from 'obug';

import { exec } from '#server/utils/cmd';
import type { ClientType } from '#db/repositories/client/types';
import type { InterfaceType } from '#db/repositories/interface/types';

const ROUTES_DEBUG = createDebug('Routes');

// Mutex to prevent concurrent route reconciles
let reconcileInProgress = false;
let reconcileQueued = false;

type IpVersion = 4 | 6;

type NormalizedRoute = {
  cidr: string;
  version: IpVersion;
};

type DeviceRoute = {
  cidr: string;
  managed: boolean;
};

type DesiredRoutes = {
  4: Set<string>;
  6: Set<string>;
};

type RoutesClient = Pick<ClientType, 'enabled' | 'serverAllowedIps'>;

/**
 * Canonicalize a Server Allowed IPs entry to `network/prefix` form.
 * `192.168.120.5/22` -> `192.168.120.0/22`; a bare IP gains `/32` or `/128`.
 * Returns null for input cidr-tools cannot parse (serverAllowedIps is validated
 * only as a permissive string).
 */
function normalizeRoute(entry: string): NormalizedRoute | null {
  try {
    const parsed = parseCidr(entry);
    const network = stringifyIp({
      number: parsed.start,
      version: parsed.version,
    });
    return { cidr: `${network}/${parsed.prefix}`, version: parsed.version };
  } catch {
    return null;
  }
}

/**
 * Whether wg-easy should add/remove this route. Excludes default routes (they
 * need wg-quick's policy routing) and IPv6 link-local / multicast.
 */
function isManageable(cidr: string, version: IpVersion): boolean {
  if (cidr.endsWith('/0')) {
    return false;
  }
  if (
    version === 6 &&
    (containsCidr('fe80::/10', cidr) || containsCidr('ff00::/8', cidr))
  ) {
    return false;
  }
  return true;
}

/**
 * Build the desired managed routes (per IP family) from enabled clients'
 * Server Allowed IPs. IPv6 is dropped when IPv6 is disabled.
 */
function collectDesiredRoutes(
  clients: RoutesClient[],
  options: { enableIpv6: boolean }
): DesiredRoutes {
  const desired: DesiredRoutes = { 4: new Set(), 6: new Set() };

  for (const client of clients) {
    if (!client.enabled) {
      continue;
    }
    for (const entry of client.serverAllowedIps ?? []) {
      const normalized = normalizeRoute(entry);
      if (!normalized) {
        continue;
      }
      if (!isManageable(normalized.cidr, normalized.version)) {
        continue;
      }
      if (normalized.version === 6 && !options.enableIpv6) {
        continue;
      }
      desired[normalized.version].add(normalized.cidr);
    }
  }

  return desired;
}

/**
 * Parse `ip route show dev <inf>` output into routes tagged with whether wg-easy
 * manages them. Kernel-installed routes (the connected subnet, link-local,
 * multicast) are present but flagged unmanaged, so they are never removed and
 * never re-added.
 */
function parseDeviceRoutes(output: string): DeviceRoute[] {
  const result: DeviceRoute[] = [];

  for (const line of output.trim().split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const dest = trimmed.split(/\s+/)[0];
    if (!dest || dest === 'default') {
      continue;
    }
    const normalized = normalizeRoute(dest);
    if (!normalized) {
      continue;
    }
    const managed =
      !trimmed.includes('proto kernel') &&
      isManageable(normalized.cidr, normalized.version);
    result.push({ cidr: normalized.cidr, managed });
  }

  return result;
}

/**
 * Compute which routes to add and which managed routes to remove. A desired
 * route already present in any form (including a kernel route) is not re-added;
 * only managed routes are removed.
 */
function diffRoutes(
  desired: Set<string>,
  current: DeviceRoute[]
): { toAdd: string[]; toDel: string[] } {
  const currentCidrs = new Set(current.map((route) => route.cidr));

  const toAdd = [...desired].filter((cidr) => !currentCidrs.has(cidr));
  const toDel = current
    .filter((route) => route.managed && !desired.has(route.cidr))
    .map((route) => route.cidr);

  return { toAdd, toDel };
}

export const routesTestExports = {
  normalizeRoute,
  isManageable,
  collectDesiredRoutes,
  parseDeviceRoutes,
  diffRoutes,
};
