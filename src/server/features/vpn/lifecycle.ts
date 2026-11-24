import fs from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

import { createError } from 'nuxt/server';

import { isExpired } from './policies';
import { peersForRunningNetwork, type PeerAddresses } from './activePeers';
import {
  defaultRoutePolicy,
  expandHook,
  generateServerConfig,
} from './configuration';
import { SiteRoutes } from './siteRoutes';

import { getDatabase } from '#db';
import type { InterfaceType } from '#db/repositories/interface/types';
import type { DatabaseStore, Repositories } from '#db/store';
import { wg } from '#server/utils/wgHelper';
import {
  checkRoutedReplySupport,
  firewall,
  routedReplyFamilies,
} from '#server/utils/firewall';
import { WG_ENV } from '#server/utils/config';
import { LinuxTunnel } from '#server/utils/linuxTunnel';
import { setTunnelMtu } from '#server/utils/tunnelMtu';

let pending: Promise<unknown> = Promise.resolve();
type ApplyMode = 'sync' | 'start' | 'restart';
type HostState = {
  tunnel: LinuxTunnel;
  routes: SiteRoutes;
  activeNetwork?: ReturnType<typeof stagedSettings>;
  activeAddresses: Map<number, PeerAddresses>;
  mtu?: number | null;
  retry?: ApplyMode;
  failedStart?: {
    error: Error;
    name: string;
    cleanupPending: boolean;
  };
};
const hostStates = new WeakMap<DatabaseStore, HostState>();

function stagedSettings({ port, device, ipv4Cidr, ipv6Cidr }: InterfaceType) {
  return { port, device, ipv4Cidr, ipv6Cidr };
}

export function restartRequired(saved: InterfaceType) {
  const active = hostStates.get(getDatabase())?.activeNetwork;
  return (
    active !== undefined && !isDeepStrictEqual(active, stagedSettings(saved))
  );
}

/** Each caller waits for its own update; a failure must not block later updates. */
function enqueue<T>(operation: () => Promise<T>) {
  const result = pending.then(operation);
  pending = result.catch(() => {});
  return result;
}

async function cleanFailedStart(
  tunnel: LinuxTunnel,
  failure: NonNullable<HostState['failedStart']>
) {
  if (failure.cleanupPending) {
    await tunnel.stop(failure.name, true);
    failure.cleanupPending = false;
  }
}

async function failedPostUp(
  state: HostState,
  name: string,
  cause: unknown
): Promise<never> {
  // An arbitrary hook may have applied external effects before failing.
  const error = createError({
    status: 503,
    statusText: 'VPN interface needs attention',
    message:
      'PostUp failed. Check the hook and its effects, then restart the VPN interface from the admin panel.',
    cause,
  });
  state.failedStart = { name, error, cleanupPending: true };
  try {
    await cleanFailedStart(state.tunnel, state.failedStart);
    delete state.retry;
  } catch (error) {
    console.error('Could not shut down the VPN after PostUp failed:', error);
  }
  throw error;
}

async function apply(mode?: ApplyMode) {
  const database = getDatabase();
  let state = hostStates.get(database);
  if (!state) {
    state = {
      tunnel: new LinuxTunnel(),
      routes: new SiteRoutes(),
      activeAddresses: new Map(),
    };
    hostStates.set(database, state);
  }
  const manualRestart = mode === 'restart' || mode === 'start';
  mode ??= state.retry ?? 'sync';
  const { savedNetwork, savedClients, hooks, defaults } =
    await database.transaction(async (tx) => ({
      savedNetwork: await tx.interfaces.get(),
      savedClients: await tx.clients.getAll(),
      hooks: await tx.hooks.get(),
      defaults: await tx.userConfigs.get(),
    }));
  const enableIpv6 = !WG_ENV.DISABLE_IPV6;
  await state.tunnel.checkOwnership(savedNetwork.name);
  if (manualRestart) {
    const gateways = await filteredSiteGateways(database);
    await checkRoutedReplySupport(
      routedReplyFamilies(gateways, !WG_ENV.DISABLE_IPV6)
    );
  }
  // Clear only after every host effect succeeds. Maintenance retries failures.
  state.retry = mode;
  if (state.failedStart) {
    await cleanFailedStart(state.tunnel, state.failedStart);
    if (!manualRestart) {
      delete state.retry;
      throw state.failedStart.error;
    }
    delete state.failedStart;
  }
  const clients = peersForRunningNetwork(
    savedClients,
    savedNetwork,
    mode === 'sync' ? state.activeNetwork : undefined,
    state.activeAddresses,
    enableIpv6
  );
  const defaultRoutes = defaultRoutePolicy(
    savedNetwork.routingTable,
    clients,
    enableIpv6
  );
  const network =
    mode === 'sync'
      ? { ...savedNetwork, ...state.activeNetwork }
      : savedNetwork;
  if (network.firewallEnabled) {
    await firewall.blockTraffic(network.name, enableIpv6);
  }

  if (mode === 'sync') {
    // Remove revoked peers before parsing or applying the full configuration.
    // An unrelated invalid or unresolvable endpoint must not preserve access.
    const enabledKeys = new Set(
      clients
        .filter((client) => client.enabled)
        .map((client) => client.publicKey)
    );
    for (const peer of await wg.dump(network.name)) {
      if (!enabledKeys.has(peer.publicKey)) {
        await wg.removePeer(network.name, peer.publicKey);
      }
    }
  } else {
    await state.tunnel.stop(network.name);
  }
  const options = {
    enableIpv6,
    amnezia: WG_ENV.WG_EXECUTABLE === 'awg',
    uiPort: WG_ENV.PORT,
  };
  const contents = generateServerConfig(
    savedNetwork,
    hooks,
    savedClients,
    options
  );
  await fs.writeFile(`/etc/wireguard/${network.name}.conf`, contents, {
    mode: 0o600,
  });
  if (mode === 'sync') {
    await wg.sync(network, clients, enableIpv6);
  } else {
    const postUp = expandHook(hooks.postUp, network, options.uiPort);
    state.routes = new SiteRoutes();
    try {
      await state.tunnel.create(network, hooks);
      await wg.sync(network, clients, enableIpv6);
      await state.tunnel.configureLink(network, enableIpv6);
    } catch (error) {
      await state.tunnel.stop(network.name, true);
      throw error;
    }
    if (postUp) {
      // A hook may use a site route, or supply a missing one itself.
      await state.routes.sync(network, clients, enableIpv6);
      await state.tunnel.defaultPolicy.sync(network, defaultRoutes);
      try {
        await wg.runHook(network.name, network.routingTable, postUp);
      } catch (cause) {
        return failedPostUp(state, network.name, cause);
      }
    }
    await state.tunnel.completeStartup(network, hooks);
    state.activeNetwork = stagedSettings(network);
  }
  state.activeAddresses = new Map(
    clients.map(({ id, ipv4Address, ipv6Address }) => [
      id,
      { ipv4Address, ipv6Address },
    ])
  );
  if (mode === 'sync' && state.mtu !== undefined && state.mtu !== network.mtu) {
    await setTunnelMtu(network.name, network.mtu);
  }
  state.mtu = network.mtu;
  // The interface and its hooks are up. Retry subsequent failures live.
  state.retry = 'sync';
  await firewall.rebuildRules(network, clients, defaults, enableIpv6);
  const siteError = await state.routes.sync(network, clients, enableIpv6);
  const policyError = await state.tunnel.defaultPolicy.sync(
    network,
    defaultRoutes
  );
  const error = siteError ?? policyError;
  if (error) {
    if (mode !== 'start') {
      throw error;
    }
    // The maintenance timer starts after this returns. Keep healthy peers up.
    console.error('Could not apply all VPN site routes at startup:', error);
    return;
  }
  delete state.retry;
}

async function filteredSiteGateways(tx: Repositories) {
  const network = await tx.interfaces.get();
  return network.firewallEnabled ? tx.clients.getEnabledSiteGateways() : [];
}

export const unchanged = Symbol('unchanged');

/** Validate new host requirements before committing, then apply the saved state. */
export function commit<T>(
  change: (tx: Repositories) => Promise<T>,
  mode?: ApplyMode
) {
  return enqueue(async () => {
    const result = await getDatabase().transaction(async (tx) => {
      const before = await filteredSiteGateways(tx);
      const value = await change(tx);
      const enableIpv6 = !WG_ENV.DISABLE_IPV6;
      const after = routedReplyFamilies(
        await filteredSiteGateways(tx),
        enableIpv6
      );
      // Revoking a peer or disabling filtering must still work if the host changes.
      const added = after.difference(routedReplyFamilies(before, enableIpv6));
      if (added.size) {
        const tunnel =
          hostStates.get(getDatabase())?.tunnel ?? new LinuxTunnel();
        await tunnel.checkOwnership((await tx.interfaces.get()).name);
        await checkRoutedReplySupport(added);
      }
      return value;
    });
    if (result !== unchanged || hostStates.get(getDatabase())?.retry) {
      await apply(mode);
    }
    return result;
  });
}

export function maintain() {
  return enqueue(async () => {
    const database = getDatabase();
    const changed = await database.transaction(async (tx) => {
      const clients = await tx.clients.getAll();
      const timestamp = Date.now();
      const expired = clients.filter(
        (client) => client.enabled && isExpired(client.expiresAt, timestamp)
      );
      if (expired.length) {
        await tx.clients.setEnabled(
          expired.map((client) => client.id),
          false
        );
      }
      for (const client of clients) {
        if (
          client.oneTimeLink &&
          isExpired(client.oneTimeLink.expiresAt, timestamp)
        ) {
          await tx.oneTimeLinks.delete(client.id);
        }
      }
      return expired.length > 0;
    });
    if (changed || hostStates.get(database)?.retry) {
      await apply();
    }
  });
}
export function restart() {
  return enqueue(() => apply('restart'));
}

export function start() {
  return enqueue(async () => {
    const { interfaces } = getDatabase();
    let network = await interfaces.get();
    if (
      network.privateKey === '---default---' &&
      network.publicKey === '---default---'
    ) {
      await interfaces.update(await wg.generateKeyPair());
      network = await interfaces.get();
    }
    if (network.h1 === '0') {
      const headers = new Set<number>();
      while (headers.size < 4) {
        headers.add(Math.floor(Math.random() * 2147483642) + 5);
      }
      const [h1, h2, h3, h4] = [...headers].map(String);
      await interfaces.update({
        h1: h1!,
        h2: h2!,
        h3: h3!,
        h4: h4!,
      });
    }
    if (
      network.firewallEnabled &&
      !(await firewall.isAvailable(!WG_ENV.DISABLE_IPV6))
    ) {
      const tools = WG_ENV.DISABLE_IPV6 ? 'iptables' : 'iptables/ip6tables';
      throw new Error(
        `Per-Client Firewall is enabled but ${tools} is not available. Refusing to start the VPN. Please install ${tools} to use this feature.`
      );
    }
    await apply('start');
  });
}

export function stop() {
  return enqueue(async () => {
    const database = getDatabase();
    const network = await database.interfaces.get();
    const state = hostStates.get(database);
    if (state?.failedStart) {
      await cleanFailedStart(state.tunnel, state.failedStart);
    } else {
      await state?.tunnel.stop(network.name);
    }
    hostStates.delete(database);
  });
}
