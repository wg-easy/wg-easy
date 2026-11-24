import fs from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

import { createError } from 'nuxt/server';

import { isExpired } from './policies';
import {
  defaultRoutePolicy,
  generateServerConfig,
  generateStartupConfig,
} from './configuration';
import { SiteRoutes } from './siteRoutes';

import { getDatabase } from '#db';
import type { DatabaseStore, Repositories } from '#db/store';
import { NativePostUpError, wg } from '#server/utils/wgHelper';
import {
  checkRoutedReplySupport,
  firewall,
  routedReplyFamilies,
} from '#server/utils/firewall';
import { WG_ENV } from '#server/utils/config';

let pending: Promise<unknown> = Promise.resolve();
type ApplyMode = 'sync' | 'start' | 'restart';
type HostState = {
  routes: SiteRoutes;
  defaultRoutes: ReturnType<typeof defaultRoutePolicy>;
  retry?: ApplyMode;
  postUpError?: Error;
};
const hostStates = new WeakMap<DatabaseStore, HostState>();

/** Each caller waits for its own update; a failure must not block later updates. */
function enqueue<T>(operation: () => Promise<T>) {
  const result = pending.then(operation);
  pending = result.catch(() => {});
  return result;
}

async function failedPostUp(
  state: HostState,
  name: string,
  cause: unknown
): Promise<never> {
  // An arbitrary hook may have applied external effects before failing.
  state.postUpError = createError({
    status: 503,
    statusText: 'VPN interface needs attention',
    message:
      'PostUp failed. Check the hook and its effects, then restart the VPN interface from the admin panel.',
    cause,
  });
  try {
    await wg.down(name);
    delete state.retry;
  } catch (error) {
    console.error('Could not shut down the VPN after PostUp failed:', error);
  }
  throw state.postUpError;
}

async function apply(mode?: ApplyMode) {
  const database = getDatabase();
  let state = hostStates.get(database);
  if (!state) {
    state = { routes: new SiteRoutes(), defaultRoutes: {} };
    hostStates.set(database, state);
  }
  const manualRestart = mode === 'restart' || mode === 'start';
  if (manualRestart) {
    const gateways = await filteredSiteGateways(database);
    await checkRoutedReplySupport(
      routedReplyFamilies(gateways, !WG_ENV.DISABLE_IPV6)
    );
  }
  mode ??= state.retry ?? 'sync';
  // Clear only after every host effect succeeds. Maintenance retries failures.
  state.retry = mode;
  const { network, clients, hooks, defaults } = await database.transaction(
    async (tx) => ({
      network: await tx.interfaces.get(),
      clients: await tx.clients.getAll(),
      hooks: await tx.hooks.get(),
      defaults: await tx.userConfigs.get(),
    })
  );
  const enableIpv6 = !WG_ENV.DISABLE_IPV6;
  if (state.postUpError && !manualRestart) {
    // If the hook's cleanup also failed, retry only the shutdown.
    await wg.down(network.name);
    delete state.retry;
    throw state.postUpError;
  }
  delete state.postUpError;
  const defaultRoutes = defaultRoutePolicy(
    network.routingTable,
    clients,
    enableIpv6
  );
  if (
    mode === 'sync' &&
    !isDeepStrictEqual(defaultRoutes, state.defaultRoutes)
  ) {
    mode = 'restart';
    state.retry = mode;
  }
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
    // wg-quick down needs the old Table setting and the live peer AllowedIPs
    // to remove its default-route policy before the new configuration is written.
    await wg.down(network.name);
  }
  const options = {
    enableIpv6,
    amnezia: WG_ENV.WG_EXECUTABLE === 'awg',
    uiPort: WG_ENV.PORT,
  };
  const contents = generateServerConfig(network, hooks, clients, options);
  const startup =
    mode === 'sync'
      ? undefined
      : generateStartupConfig(network, hooks, clients, options);

  await fs.writeFile(`/etc/wireguard/${network.name}.conf`, contents, {
    mode: 0o600,
  });
  if (mode !== 'sync') {
    try {
      const config =
        startup ??
        (hooks.postUp ? { contents, nativePostUp: true } : undefined);
      await wg.up(network.name, config);
    } catch (error) {
      if (error instanceof NativePostUpError) {
        return failedPostUp(state, network.name, error);
      }
      if (
        error instanceof Error &&
        error.message.includes(`Cannot find device "${network.name}"`)
      ) {
        throw new Error(
          `WireGuard exited with the error: Cannot find device "${network.name}"\nThis usually means that your host's kernel does not support WireGuard!`,
          { cause: error }
        );
      }
      throw error;
    }
    state.routes = new SiteRoutes();
    state.defaultRoutes = defaultRoutes;
    // Any native PostUp has completed. A sync failure must not replay it.
    if (!startup?.postUp) {
      state.retry = 'sync';
    }
  }
  await wg.sync(network, clients, enableIpv6);
  if (startup?.postUp) {
    // PostUp may use a site route, or supply one itself. Apply available
    // routes first, then check the final kernel state after the hook.
    await state.routes.sync(network, clients, enableIpv6);
    try {
      await wg.postUp(network.name, network.routingTable, startup.postUp);
    } catch (cause) {
      return failedPostUp(state, network.name, cause);
    }
  }
  // The interface and its hooks are up. Retry subsequent failures live.
  state.retry = 'sync';
  await firewall.rebuildRules(network, clients, defaults, enableIpv6);
  const error = await state.routes.sync(network, clients, enableIpv6);
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
      if (after.size) {
        await checkRoutedReplySupport(
          after.difference(routedReplyFamilies(before, enableIpv6))
        );
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
    await wg.down(network.name).catch(() => {});
    hostStates.delete(database);
  });
}
