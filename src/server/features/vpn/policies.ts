import { containsCidr, parseCidr } from 'cidr-tools';
import { createError } from 'nuxt/server';

import { authorize } from '#server/features/authorization';
import type { Actor } from '#shared/contracts/identity';
import { isClientAddress, normalizeAddress } from '#server/utils/ip';

export { authorize, type Actor };

export function authorizeClient<T extends { id: number; userId: number }>(
  actor: Actor,
  action: 'view' | 'update' | 'delete',
  client: T | undefined
) {
  // Check ownership first so a missing client does not disclose existence.
  authorize(actor, 'clients', action, client);
  if (!client)
    throw createError({ status: 404, statusText: 'Client not found' });
  return client;
}

export function isExpired(expiresAt: string | null, now: number) {
  return expiresAt !== null && now >= Date.parse(expiresAt);
}

export function assertClientEnabled(
  enabled: boolean,
  expiresAt: string | null
) {
  if (enabled && isExpired(expiresAt, Date.now())) {
    throw createError({
      status: 422,
      statusText: 'Client is expired. Please update the expiration date first.',
    });
  }
}

export function assertClientAddresses(
  settings: { ipv4Address: string; ipv6Address: string },
  network: { ipv4Cidr: string; ipv6Cidr: string },
  otherClients: { ipv4Address: string; ipv6Address: string }[]
) {
  if (!containsCidr(network.ipv4Cidr, settings.ipv4Address)) {
    throw new Error('IPv4 address is not within the CIDR range');
  }
  if (!containsCidr(network.ipv6Cidr, settings.ipv6Address)) {
    throw new Error('IPv6 address is not within the CIDR range');
  }
  const addresses = {
    ipv4Address: normalizeAddress(settings.ipv4Address),
    ipv6Address: normalizeAddress(settings.ipv6Address),
  };
  for (const version of [4, 6] as const) {
    const field = `ipv${version}Address` as const;
    if (
      !isClientAddress(
        addresses[field],
        parseCidr(network[`ipv${version}Cidr`])
      )
    ) {
      throw createError({
        status: 422,
        statusText: `IPv${version} address is reserved`,
      });
    }
    if (
      otherClients.some(
        (client) => normalizeAddress(client[field]) === addresses[field]
      )
    ) {
      throw createError({
        status: 409,
        statusText: `IPv${version} address is already in use`,
      });
    }
  }
  return addresses;
}
