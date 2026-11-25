import { createError } from 'nuxt/server';

import {
  commit,
  restart as restartVpn,
  restartRequired,
  stageCidrs,
} from './lifecycle';
import { authorize, type Actor } from './policies';

import { firewall } from '#server/utils/firewall';
import { WG_ENV } from '#server/utils/config';
import { getDatabase } from '#db';
import type {
  InterfaceCidrUpdateType,
  InterfaceUpdateType,
} from '#shared/contracts/interface';
import type { HooksUpdateType } from '#shared/contracts/hooks';
import type { UserConfigUpdateType } from '#shared/contracts/userConfig';

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
  await stageCidrs(data);
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
