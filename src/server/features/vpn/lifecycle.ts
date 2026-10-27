import fs from 'node:fs/promises';

import { isExpired } from './policies';
import { generateServerConfig } from './configuration';

import { getDatabase } from '#db';
import type { DatabaseStore, Repositories } from '#db/store';
import { wg } from '#server/utils/wgHelper';
import { firewall } from '#server/utils/firewall';
import { WG_ENV } from '#server/utils/config';

let pending: Promise<unknown> = Promise.resolve();
type ApplyMode = 'sync' | 'start' | 'restart';
const unapplied = new WeakMap<DatabaseStore, ApplyMode>();

/** Each caller waits for its own update; a failure must not block later updates. */
function enqueue<T>(operation: () => Promise<T>) {
  const result = pending.then(operation);
  pending = result.catch(() => {});
  return result;
}

async function apply(mode?: ApplyMode) {
  const database = getDatabase();
  mode ??= unapplied.get(database) ?? 'sync';
  // Clear only after every host effect succeeds. Maintenance retries failures.
  unapplied.set(database, mode);
  const { network, clients, hooks, defaults } = await database.transaction(
    async (tx) => ({
      network: await tx.interfaces.get(),
      clients: await tx.clients.getAll(),
      hooks: await tx.hooks.get(),
      defaults: await tx.userConfigs.get(),
    })
  );
  const enableIpv6 = !WG_ENV.DISABLE_IPV6;
  if (network.firewallEnabled)
    await firewall.blockTraffic(network.name, enableIpv6);

  if (mode === 'sync') {
    // Remove revoked peers before parsing or applying the full configuration.
    // An unrelated invalid or unresolvable endpoint must not preserve access.
    const enabledKeys = new Set(
      clients
        .filter((client) => client.enabled)
        .map((client) => client.publicKey)
    );
    for (const peer of await wg.dump(network.name)) {
      if (!enabledKeys.has(peer.publicKey))
        await wg.removePeer(network.name, peer.publicKey);
    }
  }
  const contents = generateServerConfig(network, hooks, clients, {
    enableIpv6,
    amnezia: WG_ENV.WG_EXECUTABLE === 'awg',
    uiPort: WG_ENV.PORT,
  });

  await fs.writeFile(`/etc/wireguard/${network.name}.conf`, contents, {
    mode: 0o600,
  });
  if (mode === 'start') {
    await wg.down(network.name).catch(() => {});
    try {
      await wg.up(network.name);
    } catch (error) {
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
  } else if (mode === 'restart') {
    await wg.restart(network.name);
  }
  await wg.sync(network.name);
  await firewall.rebuildRules(network, clients, defaults, enableIpv6);
  unapplied.delete(database);
}

/** Commit first; a host failure leaves saved state available for a later retry. */
export function commit<T>(
  change: (tx: Repositories) => Promise<T>,
  mode?: ApplyMode
) {
  return enqueue(async () => {
    const result = await getDatabase().transaction(change);
    await apply(mode);
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
      if (expired.length)
        await tx.clients.setEnabled(
          expired.map((client) => client.id),
          false
        );
      for (const client of clients) {
        if (
          client.oneTimeLink &&
          isExpired(client.oneTimeLink.expiresAt, timestamp)
        )
          await tx.oneTimeLinks.delete(client.id);
      }
      return expired.length > 0;
    });
    if (changed || unapplied.has(database)) await apply();
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
      const privateKey = await wg.generatePrivateKey();
      await interfaces.update({
        privateKey,
        publicKey: await wg.getPublicKey(privateKey),
      });
      network = await interfaces.get();
    }
    if (network.h1 === '0') {
      const headers = new Set<number>();
      while (headers.size < 4)
        headers.add(Math.floor(Math.random() * 2147483642) + 5);
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
    unapplied.delete(database);
  });
}
