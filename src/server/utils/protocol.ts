import { createError, getQuery, type H3Event } from 'h3';
import { containsCidr } from 'cidr-tools';

import { WG_ENV } from '#server/utils/config';

export type VpnProtocol = 'awg' | 'wg';

export function interfaceForProtocol(protocol: VpnProtocol) {
  return protocol === 'wg' ? WG_ENV.CLASSIC_WG_INTERFACE : WG_ENV.WG_INTERFACE;
}

export function requestedInterface(event: H3Event) {
  const protocol = getQuery(event).protocol ?? 'awg';
  if (protocol !== 'wg' && protocol !== 'awg') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid VPN protocol',
    });
  }
  return interfaceForProtocol(protocol);
}

export function assertSeparateNetworks(
  a: { ipv4Cidr: string; ipv6Cidr: string },
  b: { ipv4Cidr: string; ipv6Cidr: string }
) {
  for (const key of ['ipv4Cidr', 'ipv6Cidr'] as const) {
    if (containsCidr(a[key], b[key]) || containsCidr(b[key], a[key])) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VPN interface subnets must not overlap',
      });
    }
  }
}
