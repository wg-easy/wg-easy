import { createError } from 'nuxt/server';
import { parseCidr } from 'cidr-tools';

import {
  activeAssignments,
  commit,
  restart as restartVpn,
  restartRequired,
} from './lifecycle';
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
  await tx.interfaces.update(data);
  for (const family of ['ipv4', 'ipv6'] as const) {
    const key = `${family}Address` as const;
    const cidr = data[`${family}Cidr`];
    if (cidr === previous[`${family}Cidr`]) {
      continue;
    }
    const pool = parseCidr(cidr);
    const active = activeAssignments(cidr, family);
    const assigned = new Map<number, string>();
    const used = new Set<string>();
    const reserve = (id: number, address?: string | null) => {
      if (!address || !isClientAddress(address, pool)) {
        return;
      }
      const normalized = normalizeAddress(address);
      if (!used.has(normalized)) {
        used.add(normalized);
        assigned.set(id, address);
      }
    };
    // On a revert, the working assignments take precedence over addresses
    // which were only distributed for a future cutover.
    for (const client of clients) {
      reserve(client.id, active?.get(client.id)?.[key]);
    }
    for (const client of clients) {
      if (!assigned.has(client.id)) {
        reserve(client.id, client[key]);
      }
    }
    for (const client of clients) {
      if (!assigned.has(client.id)) {
        const address = nextIPFromUsedAddresses(pool, used);
        used.add(address);
        assigned.set(client.id, address);
      }
    }
    const changed = clients.filter(
      (client) => assigned.get(client.id) !== client[key]
    );
    // SQLite checks the unique indexes after each row update. Vacate only
    // addresses another peer needs, including cycles, inside this transaction.
    for (const client of changed) {
      if (used.has(normalizeAddress(client[key]))) {
        await tx.clients.update(client.id, { [key]: `reassign-${client.id}` });
      }
    }
    for (const client of changed) {
      await tx.clients.update(client.id, { [key]: assigned.get(client.id)! });
    }
  }
}

export async function get(actor: Actor) {
  authorize(actor, 'admin', 'any');
  const network = await getDatabase().interfaces.get();
  return {
    ...network,
    restartRequired: restartRequired(network),
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
