import fs from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

import { createError } from 'nuxt/server';

import { isExpired } from './policies';
import { peersWithVerifiedSources } from './activePeers';
import { renumberClients } from './subnets';
import {
  defaultRoutePolicy,
  expandHook,
  generateServerConfig,
  type ServerPeer,
} from './configuration';
import { checkDefaultPriorities } from './defaultPolicy';
import type { DefaultRouteTables } from './linuxRouting';
import {
  clearPostUpFailure,
  readPostUpMarker,
  writeHookMarker,
  type DownHookFailure,
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
import { DownHookError, LinuxTunnel } from '#server/utils/linuxTunnel';
import { setTunnelMtu } from '#server/utils/tunnelMtu';

let pending: Promise<unknown> = Promise.resolve();
type ApplyMode = 'sync' | 'start' | 'restart' | 'rebuild';
type HostState = {
  tunnel: LinuxTunnel;
  activeNetwork?: ReturnType<typeof stagedSettings>;
  defaultTables: DefaultRouteTables;
  mtu?: number | null;
  awaitingValidSettings?: boolean;
  retry?: ApplyMode;
  pendingHookMarker?: boolean;
  needsMarkerRead?: boolean;
  recoveringPostUp?: string;
  failedStart?: ReturnType<typeof hookFailure>;
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
    (state?.retry !== undefined && state.retry !== 'sync') ||
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
  if (!failure.cleanupPending) {
    return;
  }
  try {
    try {
      // The process may have stopped while PostUp had permitted traffic.
      const running = await tunnel.checkOwnership(failure.name);
      if (running?.filtering) {
        await firewall.blockTraffic(failure.name, !running.disableIpv6);
      }
    } finally {
      if (failure.hook === 'PostUp') {
        await tunnel.stop(failure.name, true);
      } else {
        await tunnel.stop(failure.name, false, failure.hook);
      }
    }
  } catch (cause) {
    if (cause instanceof DownHookError) {
      Object.assign(failure, hookFailure(failure.name, cause.hook, cause));
      throw failure.error;
    }
    throw cause;
  }
  failure.cleanupPending = false;
}

function hookFailure(
  name: string,
  hook: DownHookFailure | 'PostUp',
  cause?: unknown
) {
  return {
    name,
    hook,
    cleanupPending: true,
    error: createError({
      status: 503,
      statusText: 'VPN interface needs attention',
      message: `${hook} failed. Check the hook and its effects, then restart the VPN interface from the admin panel.`,
      cause,
    }),
  };
}

async function handleHookFailure(
  state: HostState,
  name: string,
  hook: DownHookFailure | 'PostUp',
  cause: unknown
): Promise<never> {
  // Keep the failure after deleting the link and its recovery record. The
  // hook may have already changed external state, even on a cold start.
  const failure = hookFailure(name, hook, cause);
  state.failedStart = failure;
  try {
    await cleanFailedStart(state.tunnel, failure);
    delete state.retry;
  } catch (error) {
    console.error(`Could not shut down the VPN after ${hook} failed:`, error);
  }
  throw failure.error;
}

/** Revoke access before saving or syncing, even if an unrelated peer fails DNS. */
async function revokePeers(name: string, clients: ServerPeer[]) {
  const enabled = new Set(
    clients.filter((client) => client.enabled).map((client) => client.publicKey)
  );
  for (const peer of await wg.dump(name)) {
    if (!enabled.has(peer.publicKey)) {
      await wg.removePeer(name, peer.publicKey);
    }
  }
}

async function getHostState(database: DatabaseStore) {
  let state = hostStates.get(database);
  if (!state) {
    state = {
      tunnel: new LinuxTunnel(),
      defaultTables: {},
      needsMarkerRead: true,
    };
    hostStates.set(database, state);
  }
  if (state.needsMarkerRead) {
    // A read error leaves the panel available. No lifecycle operation may
    // trust the journal until a subsequent read validates its generation.
    let marker;
    try {
      marker = await readPostUpMarker();
    } catch (cause) {
      state.retry ??= 'start';
      throw cause;
    }
    delete state.needsMarkerRead;
    if (marker?.succeeded) {
      state.recoveringPostUp = marker.name;
    } else if (marker) {
      state.failedStart = hookFailure(
        marker.name,
        marker.failedDownHook ?? 'PostUp'
      );
    }
  }
  return state;
}

async function stopTunnel(state: HostState, name: string) {
  const recovering = state.recoveringPostUp === name;
  try {
    await state.tunnel.stop(name);
    if (recovering) {
      await clearPostUpFailure();
      delete state.recoveringPostUp;
    }
  } catch (cause) {
    if (cause instanceof DownHookError) {
      delete state.recoveringPostUp;
      return handleHookFailure(state, name, cause.hook, cause);
    }
    if (recovering) {
      // PreDown may still be pending with stale peers on the surviving link.
      try {
        await state.tunnel.suspend(name);
      } catch (error) {
        console.error(
          `Could not suspend ${name} during tunnel recovery:`,
          error
        );
      }
    }
    throw cause;
  }
}

async function clearPendingHookMarker(state: HostState) {
  if (state.pendingHookMarker) {
    await clearPostUpFailure();
    delete state.pendingHookMarker;
  }
}

async function apply(mode?: ApplyMode, manualRestart = false) {
  const database = getDatabase();
  const state = await getHostState(database);
  const previousRetry = state.retry;
  mode ??= state.retry ?? (state.awaitingValidSettings ? 'restart' : 'sync');
  // Clear only after every host effect succeeds. Maintenance retries failures.
  state.retry = mode;
  if (state.recoveringPostUp) {
    await stopTunnel(state, state.recoveringPostUp);
  }
  const { savedNetwork, clients, hooks, defaults } = await database.transaction(
    async (tx) => ({
      savedNetwork: await tx.interfaces.get(),
      clients: await tx.clients.getAll(),
      hooks: await tx.hooks.get(),
      defaults: await tx.userConfigs.get(),
    })
  );
  const enableIpv6 = !WG_ENV.DISABLE_IPV6;
  const defaultTables = defaultRoutePolicy(
    savedNetwork.routingTable,
    clients,
    enableIpv6
  );
  const userspaceExited = await state.tunnel.userspaceExited();
  if (
    mode === 'sync' &&
    (userspaceExited || !isDeepStrictEqual(defaultTables, state.defaultTables))
  ) {
    mode = 'rebuild';
    state.retry = mode;
  }
  const options = {
    enableIpv6,
    amnezia: WG_ENV.WG_EXECUTABLE === 'awg',
    uiPort: WG_ENV.PORT,
  };
  const network =
    mode === 'sync' || mode === 'rebuild'
      ? runningSettings(savedNetwork)
      : { ...savedNetwork };
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
        await stopTunnel(state, savedNetwork.name);
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
  const running = await state.tunnel.checkOwnership(savedNetwork.name);
  let priorityError;
  if (mode !== 'sync' && state.activeNetwork && running && !userspaceExited) {
    try {
      await checkDefaultPriorities(running, defaultTables);
    } catch (error) {
      // Keep peers, revocations and filtering current on the old interface
      // while maintenance waits for the occupied priorities to be released.
      priorityError = error;
      mode = 'sync';
      Object.assign(network, state.activeNetwork);
    }
  }
  if (
    mode === 'sync' ||
    (running && mode !== 'start' && !manualRestart && !userspaceExited)
  ) {
    // Revoke disabled or deleted peers even if the following teardown fails.
    await state.tunnel.guardTraffic(network, enableIpv6);
    await revokePeers(network.name, clients);
  }
  if (mode !== 'sync' && network.firewallEnabled) {
    const gateways = clients.filter((client) => client.enabled);
    if (manualRestart && running) {
      // A rejected preflight leaves the live tunnel and any prior retry alone.
      state.retry = previousRetry;
    }
    await checkRoutedReplySupport(routedReplyFamilies(gateways, enableIpv6));
    state.retry = mode;
  }
  const syncSites = () => state.tunnel.sites.sync(network, clients, enableIpv6);
  const rebuildFirewall = () =>
    firewall.rebuildRules(network, clients, defaults, enableIpv6);

  let siteError;
  let mtuError;
  let postUp = '';
  if (mode === 'sync') {
    try {
      await writeSavedConfig();
      await wg.sync(network, clients, enableIpv6);
    } catch (error) {
      if (network.firewallEnabled) {
        const verified = peersWithVerifiedSources(
          clients,
          await wg.dump(network.name),
          enableIpv6
        );
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
    if (!priorityError) {
      siteError = await syncSites();
    }
  } else {
    assertSubnetCapacity(network, clients.length);
    if (running?.filtering && manualRestart) {
      await firewall.blockTraffic(network.name, !running.disableIpv6);
    }
    await stopTunnel(state, network.name);
    await clearPendingHookMarker(state);
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
      const policyError = await state.tunnel.configureLink(
        network,
        enableIpv6,
        defaultTables
      );
      if (policyError) {
        state.retry = 'rebuild';
        throw policyError;
      }
      state.mtu = network.mtu;
      state.defaultTables = defaultTables;
      siteError = await syncSites();
      if (postUp) {
        await writeHookMarker(network.name);
        if (network.firewallEnabled) {
          try {
            await rebuildFirewall();
          } catch (error) {
            // PostUp has not started and the rebuild guards are still active.
            await clearPostUpFailure();
            throw error;
          }
        }
      }
    } catch (error) {
      await state.tunnel.stop(network.name, true);
      throw error;
    }
    if (postUp) {
      try {
        await wg.runHook(network.name, network.routingTable, postUp);
      } catch (cause) {
        return handleHookFailure(state, network.name, 'PostUp', cause);
      }
    }
    // PostUp has returned successfully. From here, retry against the live link.
    state.retry = 'sync';
    state.pendingHookMarker = !!postUp;
    state.tunnel.armDownHooks(network, hooks);
  }
  let recoveryError: unknown = await state.tunnel.persistDownHooks();
  if (!recoveryError) {
    try {
      await clearPendingHookMarker(state);
    } catch (error) {
      recoveryError = error;
    }
  }
  if (postUp) {
    // Hooks may reload firewall rules or change individual site routes.
    await state.tunnel.guardTraffic(network, enableIpv6);
    siteError = await syncSites();
  }
  await rebuildFirewall();
  if (!network.firewallEnabled) {
    await state.tunnel.recordFiltering(false);
  }
  const error = recoveryError ?? priorityError ?? siteError ?? mtuError;
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
    const state = hostStates.get(database);
    if (changed || state?.retry || (await state?.tunnel.userspaceExited())) {
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
      } else if (
        state?.needsMarkerRead ||
        state?.recoveringPostUp ||
        state?.retry === 'sync' ||
        state?.retry === 'rebuild'
      ) {
        // Maintenance resumes pending teardown or configuration.
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
    if (!state) {
      return;
    }
    if (state.needsMarkerRead) {
      await getHostState(database);
    }
    if (state.recoveringPostUp) {
      await stopTunnel(state, state.recoveringPostUp);
    }
    if (state.failedStart) {
      await cleanFailedStart(state.tunnel, state.failedStart);
    } else {
      await stopTunnel(state, network.name);
      await clearPendingHookMarker(state);
    }
    hostStates.delete(database);
  });
}
