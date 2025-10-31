import fs from 'node:fs/promises';
import debug from 'debug';
import { encodeQR } from 'qr';
import type { InterfaceType } from '#db/repositories/interface/types';

const WG_DEBUG = debug('WireGuard');

class WireGuard {
  /**
   * Save and sync config
   */
  async saveConfig() {
    const wgInterface = await Database.interfaces.get();
    await this.#saveWireguardConfig(wgInterface);
    await this.#syncWireguardConfig(wgInterface);
  }

  /**
   * Generates and saves WireGuard config from database
   *
   * Make sure to pass an updated InterfaceType object
   */
  async #saveWireguardConfig(wgInterface: InterfaceType) {
    const clients = await Database.clients.getAll();
    const hooks = await Database.hooks.get();

    const result = [];
    result.push(
      wg.generateServerInterface(wgInterface, hooks, {
        enableIpv6: !WG_ENV.DISABLE_IPV6,
      })
    );

    for (const client of clients) {
      if (!client.enabled) {
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
    await wg.sync(wgInterface.name);
    WG_DEBUG('Config synced successfully.');
  }

  async getClientsForUser(userId: ID, filter?: string) {
    const wgInterface = await Database.interfaces.get();

    let dbClients;
    if (filter?.trim()) {
      dbClients = await Database.clients.getForUserFiltered(userId, filter);
    } else {
      dbClients = await Database.clients.getForUser(userId);
    }

    const clients = dbClients.map((client) => ({
      ...client,
      latestHandshakeAt: null as Date | null,
      endpoint: null as string | null,
      transferRx: null as number | null,
      transferTx: null as number | null,
    }));

    // Loop WireGuard status
    const dump = await wg.dump(wgInterface.name);
    dump.forEach(
      ({ publicKey, latestHandshakeAt, endpoint, transferRx, transferTx }) => {
        const client = clients.find((client) => client.publicKey === publicKey);
        if (!client) {
          return;
        }

        client.latestHandshakeAt = latestHandshakeAt;
        client.endpoint = endpoint;
        client.transferRx = transferRx;
        client.transferTx = transferTx;
      }
    );

    return clients;
  }

  async dumpByPublicKey(publicKey: string) {
    const wgInterface = await Database.interfaces.get();

    const dump = await wg.dump(wgInterface.name);
    const clientDump = dump.find(
      ({ publicKey: dumpPublicKey }) => dumpPublicKey === publicKey
    );

    return clientDump;
  }

  async getAllClients(filter?: string) {
    const wgInterface = await Database.interfaces.get();

    let dbClients;
    if (filter?.trim()) {
      dbClients = await Database.clients.getAllPublicFiltered(filter);
    } else {
      dbClients = await Database.clients.getAllPublic();
    }

    const clients = dbClients.map((client) => ({
      ...client,
      latestHandshakeAt: null as Date | null,
      endpoint: null as string | null,
      transferRx: null as number | null,
      transferTx: null as number | null,
    }));

    // Loop WireGuard status
    const dump = await wg.dump(wgInterface.name);
    dump.forEach(
      ({ publicKey, latestHandshakeAt, endpoint, transferRx, transferTx }) => {
        const client = clients.find((client) => client.publicKey === publicKey);
        if (!client) {
          return;
        }

        client.latestHandshakeAt = latestHandshakeAt;
        client.endpoint = endpoint;
        client.transferRx = transferRx;
        client.transferTx = transferTx;
      }
    );

    return clients;
  }

  async getClientConfiguration({ clientId }: { clientId: ID }) {
    const wgInterface = await Database.interfaces.get();
    const userConfig = await Database.userConfigs.get();

    const client = await Database.clients.get(clientId);

    if (!client) {
      throw new Error('Client not found');
    }

    return wg.generateClientConfig(wgInterface, userConfig, client, {
      enableIpv6: !WG_ENV.DISABLE_IPV6,
    });
  }

  async getClientQRCodeSVG({ clientId }: { clientId: ID }) {
    const config = await this.getClientConfiguration({ clientId });
    return encodeQR(config, 'svg', {
      ecc: 'high',
      scale: 2,
      encoding: 'byte',
    });
  }

  cleanClientFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_=+.-]/g, '-')
      .replace(/(-{2,}|-$)/g, '-')
      .replace(/-$/, '')
      .substring(0, 32);
  }

  async Startup() {
    WG_DEBUG('Starting WireGuard...');
    // let as it has to refetch if keys change
    let wgInterface = await Database.interfaces.get();

    // default interface has no keys
    if (
      wgInterface.privateKey === '---default---' &&
      wgInterface.publicKey === '---default---'
    ) {
      WG_DEBUG('Generating new Wireguard Keys...');
      const privateKey = await wg.generatePrivateKey();
      const publicKey = await wg.getPublicKey(privateKey);

      await Database.interfaces.updateKeyPair(privateKey, publicKey);
      wgInterface = await Database.interfaces.get();
      WG_DEBUG('New Wireguard Keys generated successfully.');
    }
    WG_DEBUG(`Starting Wireguard Interface ${wgInterface.name}...`);
    await this.#saveWireguardConfig(wgInterface);
    await wg.down(wgInterface.name).catch(() => {});
    await wg.up(wgInterface.name).catch((err) => {
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

    WG_DEBUG('Starting Cron Job...');
    await this.startCronJob();
    WG_DEBUG('Cron Job started successfully.');
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
  async Shutdown() {
    const wgInterface = await Database.interfaces.get();
    await wg.down(wgInterface.name).catch(() => {});
  }

  async Restart() {
    const wgInterface = await Database.interfaces.get();
    await wg.restart(wgInterface.name);
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
