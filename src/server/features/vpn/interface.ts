import { createError } from 'nuxt/server';
import { parseCidr } from 'cidr-tools';

import { commit, restart as restartVpn } from './lifecycle';
import { authorize, type Actor } from './policies';

import { firewall } from '#server/utils/firewall';
import { WG_ENV } from '#server/utils/config';
import { getDatabase } from '#db';
import type { Repositories } from '#db/store';
import type {
  InterfaceCidrUpdateType,
  InterfaceUpdateType,
} from '#shared/contracts/interface';
import type { HooksUpdateType } from '#shared/contracts/hooks';
import type { UserConfigUpdateType } from '#shared/contracts/userConfig';
import {
  isClientAddress,
  nextIPFromUsedAddresses,
  normalizeAddress,
} from '#server/utils/ip';

/** The interface and every reassigned address belong to the same transaction. */
export async function changeCidr(
  tx: Repositories,
  data: InterfaceCidrUpdateType
) {
  const previous = await tx.interfaces.get();
  const clients = await tx.clients.getAll();
  const ipv4Addresses = new Set(
    clients.map((client) => normalizeAddress(client.ipv4Address))
  );
  const ipv6Addresses = new Set(
    clients.map((client) => normalizeAddress(client.ipv6Address))
  );
  const cidr4 = parseCidr(data.ipv4Cidr);
  const cidr6 = parseCidr(data.ipv6Cidr);
  await tx.interfaces.update(data);
  for (const client of clients) {
    let ipv4Address = client.ipv4Address;
    let ipv6Address = client.ipv6Address;
    if (
      data.ipv4Cidr !== previous.ipv4Cidr &&
      !isClientAddress(ipv4Address, cidr4)
    ) {
      ipv4Address = nextIPFromUsedAddresses(cidr4, ipv4Addresses);
      ipv4Addresses.add(ipv4Address);
      ipv4Addresses.delete(normalizeAddress(client.ipv4Address));
    }
    if (
      data.ipv6Cidr !== previous.ipv6Cidr &&
      !isClientAddress(ipv6Address, cidr6)
    ) {
      ipv6Address = nextIPFromUsedAddresses(cidr6, ipv6Addresses);
      ipv6Addresses.add(ipv6Address);
      ipv6Addresses.delete(normalizeAddress(client.ipv6Address));
    }
    await tx.clients.update(client.id, { ipv4Address, ipv6Address });
  }
}

export async function get(actor: Actor) {
  authorize(actor, 'admin', 'any');
  return {
    ...(await getDatabase().interfaces.get()),
    privateKey: undefined,
  };
}

export async function update(actor: Actor, data: InterfaceUpdateType) {
  authorize(actor, 'admin', 'any');
  if (data.firewallEnabled) {
    firewall.clearAvailabilityCache();
    if (!(await firewall.isAvailable(!WG_ENV.DISABLE_IPV6))) {
      const tools = !WG_ENV.DISABLE_IPV6
        ? 'iptables and ip6tables'
        : 'iptables';
      throw createError({
        status: 400,
        statusText: `Per-Client Firewall requires ${tools} to be installed on the host system. Please install ${tools} before enabling this feature.`,
      });
    }
  }
  await commit((tx) => tx.interfaces.update(data));
}

export async function updateCidr(actor: Actor, data: InterfaceCidrUpdateType) {
  authorize(actor, 'admin', 'any');
  await commit((tx) => changeCidr(tx, data));
}

export function getHooks(actor: Actor) {
  authorize(actor, 'admin', 'any');
  return getDatabase().hooks.get();
}

export async function updateHooks(actor: Actor, data: HooksUpdateType) {
  authorize(actor, 'admin', 'any');
  await commit((tx) => tx.hooks.update(data));
}

export function getDefaults(actor: Actor) {
  authorize(actor, 'admin', 'any');
  return getDatabase().userConfigs.get();
}

export async function updateDefaults(actor: Actor, data: UserConfigUpdateType) {
  authorize(actor, 'admin', 'any');
  await commit((tx) => tx.userConfigs.update(data));
}

export function restart(actor: Actor) {
  authorize(actor, 'admin', 'any');
  return restartVpn();
}
