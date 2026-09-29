import fs from 'node:fs/promises';
import { randomInt } from 'node:crypto';

import { createDebug } from 'obug';

import Database from '#server/utils/Database';
import { mergeClientStatuses } from '#server/utils/clientStatus';
import { OLD_ENV, WG_ENV } from '#server/utils/config';
import { firewall } from '#server/utils/firewall';
import { encodeQRCode } from '#server/utils/qr';
import type { ID } from '#server/utils/types';
import { wg } from '#server/utils/wgHelper';
import { setIntervalImmediately } from '#shared/utils/time';
import type { InterfaceType } from '#db/repositories/interface/types';
import type { ClientQueryType } from '#db/repositories/client/types';

const WG_DEBUG = createDebug('WireGuard');

const generateRandomHeaderValue = () => randomInt(5, 2147483647);

class WireGuard {
  /**
   * Save and sync config
   */
  #operations: Promise<void> = Promise.resolve();

  // Serialize both interfaces so concurrent API requests cannot overwrite a
  // newer peer list or rebuild the other interface's firewall with stale data.
  #enqueue(operation: () => Promise<void>) {
    const pending = this.#operations.then(operation);
    this.#operations = pending.catch(() => {});
    return pending;
  }

  saveConfig() {
    return this.#enqueue(async () => {
      for (const iface of await Database.interfaces.getAll()) {
        await this.#saveWireguardConfig(iface);
        await this.#syncWireguardConfig(iface);
        await this.#applyFirewallRules(iface);
      }
    });
  }

  async #dumpAll() {
    const result = [];
    for (const iface of await Database.interfaces.getAll()) {
      const rows = await wg.dump(iface.name, iface.protocol);
      result.push(...rows.map((row) => ({ ...row, interfaceId: iface.name })));
    }
    return result;
  }

  /**
   * Apply firewall rules based on current config
   */
  async #applyFirewallRules(wgInterface: InterfaceType) {
    const clients = (await Database.clients.getAll()).filter(
      (client) => client.interfaceId === wgInterface.name
    );
    const userConfig = await Database.userConfigs.get(wgInterface.name);
    await firewall.rebuildRules(
      wgInterface,
      clients,
      userConfig,
      !WG_ENV.DISABLE_IPV6
    );
  }

  /**
   * Generates and saves WireGuard config from database
   *
   * Make sure to pass an updated InterfaceType object
   */
  async #saveWireguardConfig(wgInterface: InterfaceType) {
    const clients = await Database.clients.getAll();
    const hooks = await Database.hooks.get(wgInterface.name);

    const result = [];
    result.push(
      wg.generateServerInterface(wgInterface, hooks, {
        enableIpv6: !WG_ENV.DISABLE_IPV6,
      })
    );

    for (const client of clients) {
      if (!client.enabled || client.interfaceId !== wgInterface.name) {
        continue;
      }
      result.push(
        wg.generateServerPeer(client, {
          enableIpv6: !WG_ENV.DISABLE_IPV6,
        })
      );
    }

    result.push('');

    WG_DEBUG('Saving Config...');
    await fs.writeFile(
      `/etc/wireguard/${wgInterface.name}.conf`,
      result.join('\n\n'),
      {
        mode: 0o600,
      }
    );
    WG_DEBUG('Config saved successfully.');
  }

  async #syncWireguardConfig(wgInterface: InterfaceType) {
    WG_DEBUG('Syncing Config...');
    await wg.sync(wgInterface.name, wgInterface.protocol);
    WG_DEBUG('Config synced successfully.');
  }

  async getClientsForUser(userId: ID, query: ClientQueryType) {
    const dbClients = await Database.clients.getAllForUser(userId, query);

    const interfaces = await Database.interfaces.getAll();
    const clients = dbClients.map((client) => ({
      ...client,
      protocol: interfaces.find((iface) => iface.name === client.interfaceId)!
        .protocol,
      latestHandshakeAt: null as Date | null,
      endpoint: null as string | null,
      transferRx: null as number | null,
      transferTx: null as number | null,
    }));

    // Loop WireGuard status
    const dump = await this.#dumpAll();
    return mergeClientStatuses(clients, dump);
  }

  async dumpByPublicKey(publicKey: string, interfaceId: string) {
    const dump = await this.#dumpAll();
    const clientDump = dump.find(
      (row) => row.publicKey === publicKey && row.interfaceId === interfaceId
    );

    return clientDump;
  }

  async getAllClients(query: ClientQueryType = {}) {
    const dbClients = await Database.clients.getAllPublic(query);

    const interfaces = await Database.interfaces.getAll();
    const clients = dbClients.map((client) => ({
      ...client,
      protocol: interfaces.find((iface) => iface.name === client.interfaceId)!
        .protocol,
      latestHandshakeAt: null as Date | null,
      endpoint: null as string | null,
      transferRx: null as number | null,
      transferTx: null as number | null,
    }));

    // Loop WireGuard status
    const dump = await this.#dumpAll();
    return mergeClientStatuses(clients, dump);
  }

  async getClientConfiguration({ clientId }: { clientId: ID }) {
    const client = await Database.clients.get(clientId);

    if (!client) {
      throw new Error('Client not found');
    }

    const wgInterface = await Database.interfaces.get(client.interfaceId);
    const userConfig = await Database.userConfigs.get(client.interfaceId);
    // Fresh interactive setup initially only supplies the AWG public hostname.
    if (!userConfig.host)
      userConfig.host = (await Database.userConfigs.get()).host;
    return wg.generateClientConfig(wgInterface, userConfig, client, {
      enableIpv6: !WG_ENV.DISABLE_IPV6,
    });
  }

  async getClientQRCodeSVG({ clientId }: { clientId: ID }) {
    const config = await this.getClientConfiguration({ clientId });
    return encodeQRCode(config);
  }

  cleanClientFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_=+.-]/g, '-')
      .replace(/(-{2,}|-$)/g, '-')
      .replace(/-$/, '')
      .substring(0, 32);
  }

  async Startup() {
    const started: InterfaceType[] = [];
    try {
      for (const iface of await Database.interfaces.getAll()) {
        started.push(iface);
        await this.#startInterface(iface.name);
      }
    } catch (error) {
      for (const iface of started.reverse())
        await wg.down(iface.name, iface.protocol).catch(() => {});
      throw error;
    }
    await this.startCronJob();
  }

  async #startInterface(interfaceName: string) {
    WG_DEBUG('Starting WireGuard...');
    // let as it has to refetch if keys change
    let wgInterface = await Database.interfaces.get(interfaceName);

    // default interface has no keys
    if (
      wgInterface.privateKey === '---default---' &&
      wgInterface.publicKey === '---default---'
    ) {
      WG_DEBUG('Generating new Wireguard Keys...');
      const privateKey = await wg.generatePrivateKey(wgInterface.protocol);
      const publicKey = await wg.getPublicKey(privateKey, wgInterface.protocol);

      // Persist keys and AWG defaults together; a restart must not rotate the
      // shared header-protection key or partially initialize the interface.
      await Database.interfaces.initialize(
        privateKey,
        publicKey,
        interfaceName
      );
      wgInterface = await Database.interfaces.get(interfaceName);
      WG_DEBUG('New Wireguard Keys generated successfully.');
    }

    if (wgInterface.protocol === 'awg' && wgInterface.h1 === '0') {
      WG_DEBUG('Generating random AmneziaWG obfuscation parameters...');
      const headers = new Set<number>();

      while (headers.size < 4) {
        headers.add(generateRandomHeaderValue());
      }
      const [h1, h2, h3, h4] = Array.from(headers);

      wgInterface.h1 = String(h1)!;
      wgInterface.h2 = String(h2)!;
      wgInterface.h3 = String(h3)!;
      wgInterface.h4 = String(h4)!;

      await Database.interfaces.update(wgInterface, interfaceName);
    }

    WG_DEBUG(`Starting Wireguard Interface ${wgInterface.name}...`);
    await this.#saveWireguardConfig(wgInterface);
    await wg.down(wgInterface.name, wgInterface.protocol).catch(() => {});
    await wg.up(wgInterface.name, wgInterface.protocol).catch((err) => {
      if (
        err &&
        err.message &&
        err.message.includes(`Cannot find device "${wgInterface.name}"`)
      ) {
        throw new Error(
          `WireGuard exited with the error: Cannot find device "${wgInterface.name}"\nThis usually means that your host's kernel does not support WireGuard!`,
          { cause: err.message }
        );
      }

      throw err;
    });
    await this.#syncWireguardConfig(wgInterface);
    WG_DEBUG(`Wireguard Interface ${wgInterface.name} started successfully.`);

    // Check if firewall was enabled but iptables isn't available
    if (wgInterface.firewallEnabled) {
      const enableIpv6 = !WG_ENV.DISABLE_IPV6;
      const iptablesAvailable = await firewall.isAvailable(enableIpv6);
      if (!iptablesAvailable) {
        const requiredTools = enableIpv6 ? 'iptables/ip6tables' : 'iptables';
        console.warn(
          `WARNING: Per-Client Firewall is enabled but ${requiredTools} is not available. Disabling firewall feature. Please install ${requiredTools} to use this feature.`
        );
        await Database.interfaces.setFirewallEnabled(false, interfaceName);
        wgInterface.firewallEnabled = false; // Update local copy
      }
    }

    WG_DEBUG('Applying firewall rules...');
    await this.#applyFirewallRules(wgInterface);
    WG_DEBUG('Firewall rules applied successfully.');
  }

  // TODO: handle as worker_thread
  async startCronJob() {
    setIntervalImmediately(() => {
      this.cronJob().catch((err) => {
        WG_DEBUG('Running Cron Job failed.');
        console.error(err);
      });
    }, 60 * 1000);
  }

  // Shutdown wireguard
  Shutdown() {
    return this.#enqueue(async () => {
      for (const iface of await Database.interfaces.getAll()) {
        await wg.down(iface.name, iface.protocol).catch(() => {});
      }
    });
  }

  Restart(interfaceName?: string) {
    return this.#enqueue(async () => {
      for (const iface of await Database.interfaces.getAll()) {
        if (interfaceName && iface.name !== interfaceName) continue;
        // Teardown uses the old file, including its old NAT subnet and hooks.
        await wg.down(iface.name, iface.protocol);
        await this.#saveWireguardConfig(iface);
        await wg.up(iface.name, iface.protocol);
        await this.#applyFirewallRules(iface);
      }
    });
  }

  async cronJob() {
    const clients = await Database.clients.getAll();
    let needsSave = false;
    // Expires Feature
    for (const client of clients) {
      if (client.enabled !== true) continue;
      if (
        client.expiresAt !== null &&
        new Date() > new Date(client.expiresAt)
      ) {
        WG_DEBUG(`Client ${client.id} expired.`);
        await Database.clients.toggle(client.id, false);
        needsSave = true;
      }
    }
    // One Time Link Feature
    for (const client of clients) {
      if (
        client.oneTimeLink !== null &&
        new Date() > new Date(client.oneTimeLink.expiresAt)
      ) {
        WG_DEBUG(`OneTimeLink for Client ${client.id} expired.`);
        await Database.oneTimeLinks.delete(client.id);
        // otl does not need wireguard sync
      }
    }

    if (needsSave) {
      await this.saveConfig();
    }
  }
}

if (OLD_ENV.PASSWORD || OLD_ENV.PASSWORD_HASH) {
  throw new Error(
    `
You are using an invalid Configuration for wg-easy
Please follow the instructions on https://wg-easy.github.io/wg-easy/latest/advanced/migrate/from-14-to-15/ to migrate
`
  );
}

// TODO: make static or object

export default new WireGuard();
