import fs from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

import { createError } from 'nuxt/server';

import { isExpired } from './policies';
import { peersWithVerifiedSources } from './activePeers';
import { renumberClients } from './subnets';
import {
  expandHook,
  generateServerConfig,
  type ServerPeer,
} from './configuration';
import type { RouteFamily } from './linuxRouting';
import {
  clearPostUpFailure,
  readPostUpFailure,
  recordPostUpFailure,
} from './tunnelRecord';

import { getDatabase } from '#db';
import { assertSubnetCapacity } from '#server/utils/ip';
import type { InterfaceCidrUpdateType } from '#shared/contracts/interface';
import {
  minimumIpv6Mtu,
  MtuSchema,
  RoutingTableSchema,
} from '#shared/contracts/validation';
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
  activeNetwork?: ReturnType<typeof stagedSettings>;
  restoredDefaults: Map<string, string | undefined>;
  mtu?: number | null;
  awaitingValidSettings?: boolean;
  retry?: ApplyMode;
  failedStart?: ReturnType<typeof postUpFailure>;
};
const hostStates = new WeakMap<DatabaseStore, HostState>();

function stagedSettings({ port, device, ipv4Cidr, ipv6Cidr }: InterfaceType) {
  return { port, device, ipv4Cidr, ipv6Cidr };
}

export function runningSettings(saved: InterfaceType) {
  return { ...saved, ...hostStates.get(getDatabase())?.activeNetwork };
}

export function stageCidrs(cidrs: InterfaceCidrUpdateType) {
  return enqueue(() =>
    getDatabase().transaction(async (tx) => {
      assertSubnetCapacity(cidrs, await tx.clients.count());
      await tx.interfaces.update(cidrs);
    })
  );
}

export function restartRequired(saved: InterfaceType) {
  const state = hostStates.get(getDatabase());
  const active = state?.activeNetwork;
  return (
    !!state?.failedStart ||
    !!state?.awaitingValidSettings ||
    (active !== undefined && !isDeepStrictEqual(active, stagedSettings(saved)))
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

function postUpFailure(name: string, cause?: unknown) {
  return {
    name,
    cleanupPending: true,
    error: createError({
      status: 503,
      statusText: 'VPN interface needs attention',
      message:
        'PostUp failed. Check the hook and its effects, then restart the VPN interface from the admin panel.',
      cause,
    }),
  };
}

async function handlePostUpFailure(
  state: HostState,
  name: string,
  cause: unknown
): Promise<never> {
  // Keep the failure after deleting the link and its recovery record. The
  // hook may have already changed external state, even on a cold start.
  const failure = postUpFailure(name, cause);
  state.failedStart = failure;
  try {
    await recordPostUpFailure(name);
  } finally {
    try {
      await cleanFailedStart(state.tunnel, failure);
      delete state.retry;
    } catch (error) {
      console.error('Could not shut down the VPN after PostUp failed:', error);
    }
  }
  throw failure.error;
}

/** Revoke access before saving or syncing, even if an unrelated peer fails DNS. */
async function revokePeers(
  name: string,
  clients: ServerPeer[],
  enableIpv6: boolean
) {
  const gateways: Partial<Record<RouteFamily, string>> = {};
  const enabled = new Set(
    clients.filter((client) => client.enabled).map((client) => client.publicKey)
  );
  for (const peer of await wg.dump(name)) {
    if (!enabled.has(peer.publicKey)) {
      await wg.removePeer(name, peer.publicKey);
      continue;
    }
    const allowed = peer.allowedIps.split(',');
    if (allowed.includes('0.0.0.0/0')) {
      gateways.ipv4 = peer.publicKey;
    }
    if (enableIpv6 && allowed.includes('::/0')) {
      gateways.ipv6 = peer.publicKey;
    }
  }
  return gateways;
}

async function getHostState(database: DatabaseStore) {
  let state = hostStates.get(database);
  if (!state) {
    const failedName = await readPostUpFailure();
    state = {
      tunnel: new LinuxTunnel(),
      restoredDefaults: new Map(),
    };
    if (failedName) {
      state.failedStart = postUpFailure(failedName);
    }
    hostStates.set(database, state);
  }
  return state;
}

async function apply(mode?: ApplyMode, manualRestart = false) {
  const database = getDatabase();
  const state = await getHostState(database);
  mode ??= state.retry ?? (state.awaitingValidSettings ? 'restart' : 'sync');
  // Clear only after every host effect succeeds. Maintenance retries failures.
  state.retry = mode;
  const { savedNetwork, clients, hooks, defaults } = await database.transaction(
    async (tx) => ({
      savedNetwork: await tx.interfaces.get(),
      clients: await tx.clients.getAll(),
      hooks: await tx.hooks.get(),
      defaults: await tx.userConfigs.get(),
    })
  );
  const enableIpv6 = !WG_ENV.DISABLE_IPV6;
  const options = {
    enableIpv6,
    amnezia: WG_ENV.WG_EXECUTABLE === 'awg',
    uiPort: WG_ENV.PORT,
  };
  const network =
    mode === 'sync' ? runningSettings(savedNetwork) : { ...savedNetwork };
  // Older versions accepted IPv4-sized MTUs on dual-stack tunnels.
  if (enableIpv6 && network.mtu !== null) {
    network.mtu = Math.max(minimumIpv6Mtu, network.mtu);
  }
  async function writeSavedConfig() {
    const contents = generateServerConfig(
      {
        ...savedNetwork,
        mtu: network.mtu,
        ipv4Cidr: network.ipv4Cidr,
        ipv6Cidr: network.ipv6Cidr,
      },
      hooks,
      clients,
      options
    );
    await fs.writeFile(`/etc/wireguard/${savedNetwork.name}.conf`, contents, {
      mode: 0o600,
    });
  }
  if (state.failedStart) {
    await cleanFailedStart(state.tunnel, state.failedStart);
    if (!manualRestart) {
      await writeSavedConfig();
      delete state.retry;
      throw state.failedStart.error;
    }
    await clearPostUpFailure();
    delete state.failedStart;
  }
  if (mode !== 'sync') {
    // Older releases accepted fractional MTUs and invalid routing table IDs.
    // Leave the saved values available for repair in the admin panel.
    if (
      !MtuSchema.safeParse(savedNetwork.mtu).success ||
      !RoutingTableSchema.safeParse(savedNetwork.routingTable).success
    ) {
      if (!state.awaitingValidSettings) {
        await state.tunnel.stop(savedNetwork.name);
        state.awaitingValidSettings = true;
      }
      delete state.retry;
      const message =
        'The VPN interface is down. Correct the saved MTU or routing table in the admin panel.';
      if (mode === 'start') {
        console.error(message);
        return;
      }
      throw createError({ status: 422, message });
    }
    delete state.awaitingValidSettings;
  }
  if (
    mode === 'start' &&
    network.firewallEnabled &&
    !(await firewall.isAvailable(enableIpv6))
  ) {
    const tools = enableIpv6 ? 'iptables/ip6tables' : 'iptables';
    throw new Error(
      `Per-Client Firewall is enabled but ${tools} is not available. Refusing to start the VPN. Please install ${tools} to use this feature.`
    );
  }
  await state.tunnel.checkOwnership(savedNetwork.name);
  if (mode !== 'sync' && network.firewallEnabled) {
    const gateways = clients.filter((client) => client.enabled);
    await checkRoutedReplySupport(routedReplyFamilies(gateways, enableIpv6));
  }
  const verifiedPeers = async () =>
    peersWithVerifiedSources(
      clients,
      await wg.dump(network.name),
      enableIpv6,
      state.restoredDefaults
    );
  const rebuildFirewall = async (verifySources: boolean) =>
    firewall.rebuildRules(
      network,
      verifySources && network.firewallEnabled
        ? await verifiedPeers()
        : clients,
      defaults,
      enableIpv6
    );
  function syncRoutes(
    previousGateways: Partial<Record<RouteFamily, string>> = {}
  ) {
    state.restoredDefaults.clear();
    return state.tunnel.syncRoutes(
      network,
      clients,
      enableIpv6,
      async (family, prefix) => {
        const key = previousGateways[family];
        await wg.restoreDefault(network.name, prefix, key);
        state.restoredDefaults.set(prefix, key);
      }
    );
  }

  let routes;
  let mtuError;
  let postUp = '';
  if (mode === 'sync') {
    await state.tunnel.guardTraffic(network, enableIpv6);
    const previousGateways = await revokePeers(
      network.name,
      clients,
      enableIpv6
    );
    await writeSavedConfig();
    try {
      await wg.sync(network, clients, enableIpv6);
    } catch (error) {
      if (network.firewallEnabled) {
        const verified = await verifiedPeers();
        if (verified.length) {
          await firewall.rebuildRules(network, verified, defaults, enableIpv6);
        }
      }
      throw error;
    }
    try {
      if (state.mtu !== undefined && state.mtu !== network.mtu) {
        await setTunnelMtu(network.name, network.mtu);
      }
      state.mtu = network.mtu;
    } catch (error) {
      // Reconcile routes and reopen filtered traffic before retrying the MTU.
      mtuError = error;
    }
    routes = await syncRoutes(previousGateways);
  } else {
    assertSubnetCapacity(network, clients.length);
    await state.tunnel.stop(network.name);
    await database.transaction((tx) => renumberClients(tx, clients, network));
    state.activeNetwork = stagedSettings(network);
    await writeSavedConfig();

    postUp = expandHook(hooks.postUp, network, options.uiPort);
    state.tunnel = new LinuxTunnel();
    try {
      // An unconfigured link cannot carry peer traffic. Bind its identity and
      // filtering claim before installing the guard or handing it to PreUp.
      await state.tunnel.create(network);
      await state.tunnel.guardTraffic(network, enableIpv6);
      if (hooks.preUp) {
        await wg.runHook(
          network.name,
          network.routingTable,
          expandHook(hooks.preUp, network, options.uiPort)
        );
      }
      await wg.sync(network, clients, enableIpv6);
      await state.tunnel.configureLink(network, enableIpv6);
      state.mtu = network.mtu;
      routes = await syncRoutes();
      if (postUp && network.firewallEnabled) {
        await rebuildFirewall(!!routes.policyError);
      }
    } catch (error) {
      await state.tunnel.stop(network.name, true);
      throw error;
    }
    if (postUp) {
      try {
        await wg.runHook(network.name, network.routingTable, postUp);
      } catch (cause) {
        return handlePostUpFailure(state, network.name, cause);
      }
    }
    // PostUp has returned successfully. From here, retry against the live link.
    state.retry = 'sync';
    state.tunnel.armDownHooks(network, hooks);
  }
  const recoveryError = await state.tunnel.persistDownHooks();
  if (postUp) {
    // Hooks may reload firewall rules, replace routes or resolve a conflict.
    await state.tunnel.guardTraffic(network, enableIpv6);
    if (routes.policyError) {
      // The first pass withdrew the failed family's default from the peer.
      await wg.sync(network, clients, enableIpv6);
    }
    routes = await syncRoutes();
  }
  await rebuildFirewall(!!routes.policyError);
  if (!network.firewallEnabled) {
    await state.tunnel.recordFiltering(false);
  }
  const error =
    recoveryError ?? routes.siteError ?? routes.policyError ?? mtuError;
  if (error) {
    throw error;
  }
  delete state.retry;
}

async function requiredReplyFamilies(tx: Repositories) {
  const network = await tx.interfaces.get();
  const gateways = network.firewallEnabled
    ? await tx.clients.getEnabledSiteGateways()
    : [];
  return routedReplyFamilies(gateways, !WG_ENV.DISABLE_IPV6);
}

export const unchanged = Symbol('unchanged');

/** Validate new host requirements before committing, then apply the saved state. */
export function commit<T>(
  change: (tx: Repositories) => Promise<T>,
  mode?: ApplyMode
) {
  return enqueue(async () => {
    const result = await getDatabase().transaction(async (tx) => {
      const before = await requiredReplyFamilies(tx);
      const value = await change(tx);
      const after = await requiredReplyFamilies(tx);
      // Revoking a peer or disabling filtering must still work if the host changes.
      const added = after.difference(before);
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
  return enqueue(() => apply('restart', true));
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
    try {
      await apply('start');
    } catch (error) {
      const state = hostStates.get(getDatabase());
      if (state?.failedStart) {
        // Keep the database and admin panel available for hook repair.
        console.error('VPN startup is waiting for an explicit restart:', error);
      } else if (state?.retry === 'sync') {
        // PostUp completed. Leave the generation up for the maintenance timer.
        console.error(
          'Could not finish applying the VPN configuration at startup:',
          error
        );
      } else {
        throw error;
      }
    }
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
