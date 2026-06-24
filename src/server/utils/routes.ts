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

export const routesTestExports = {
  normalizeRoute,
  isManageable,
};
