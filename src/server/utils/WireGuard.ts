import fs from 'node:fs/promises';
import debug from 'debug';
import QRCode from 'qrcode';
import type { ID } from '#db/schema';

const WG_DEBUG = debug('WireGuard');

class WireGuard {
  /**
   * Save and sync config
   */
  async saveConfig() {
    await this.#saveWireguardConfig('wg0');
    await this.#syncWireguardConfig('wg0');
  }

  /**
   * Generates and saves WireGuard config from database as wg0
   */
  async #saveWireguardConfig(infName: string) {
    const wgInterface = await Database.interfaces.get(infName);
    const clients = await Database.clients.getAll();
    const hooks = await Database.hooks.get(infName);

    if (!wgInterface || !hooks) {
      throw new Error('Interface or Hooks not found');
    }

    const result = [];
    result.push(wg.generateServerInterface(wgInterface, hooks));

    for (const client of clients) {
      if (!client.enabled) {
        continue;
      }
      result.push(wg.generateServerPeer(client));
    }

    WG_DEBUG('Saving Config...');
    await fs.writeFile(`/etc/wireguard/${infName}.conf`, result.join('\n\n'), {
      mode: 0o600,
    });
    WG_DEBUG('Config saved successfully.');
  }

  async #syncWireguardConfig(infName: string) {
    WG_DEBUG('Syncing Config...');
    await wg.sync(infName);
    WG_DEBUG('Config synced successfully.');
  }

  async getClients() {
    const dbClients = await Database.clients.getAll();
    const clients = dbClients.map((client) => ({
      ...client,
      latestHandshakeAt: null as Date | null,
      endpoint: null as string | null,
      transferRx: null as number | null,
      transferTx: null as number | null,
    }));

    // Loop WireGuard status
    const dump = await wg.dump('wg0');
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
    const wgInterface = await Database.interfaces.get('wg0');
    const userConfig = await Database.userConfigs.get('wg0');

    if (!wgInterface || !userConfig) {
      throw new Error('Interface or UserConfig not found');
    }

    const client = await Database.clients.get(clientId);

    if (!client) {
      throw new Error('Client not found');
    }

    return wg.generateClientConfig(wgInterface, userConfig, client);
  }

  async getClientQRCodeSVG({ clientId }: { clientId: ID }) {
    const config = await this.getClientConfiguration({ clientId });
    return QRCode.toString(config, {
      type: 'svg',
      width: 512,
    });
  }

  // TODO: reimplement database restore
  async restoreConfiguration(_config: string) {
    /* DEBUG('Starting configuration restore process.');
    // TODO: sanitize config
    const _config = JSON.parse(config);
    await this.__saveConfig(_config);
    await this.__reloadConfig();
    DEBUG('Configuration restore process completed.'); */
  }

  // TODO: reimplement database restore
  async backupConfiguration() {
    /* DEBUG('Starting configuration backup.');
    const config = await this.getConfig();
    const backup = JSON.stringify(config, null, 2);
    DEBUG('Configuration backup completed.');
    return backup; */
  }

  async Startup() {
    WG_DEBUG('Starting WireGuard...');
    const wgInterfaces = await Database.interfaces.getAll();
    for (const wgInterface of wgInterfaces) {
      if (wgInterface.enabled !== true) {
        continue;
      }
      // default interface has no keys
      if (
        wgInterface.privateKey === '---default---' &&
        wgInterface.publicKey === '---default---'
      ) {
        WG_DEBUG('Generating new Wireguard Keys...');
        const privateKey = await wg.generatePrivateKey();
        const publicKey = await wg.getPublicKey(privateKey);

        await Database.interfaces.updateKeyPair(
          wgInterface.name,
          privateKey,
          publicKey
        );
        WG_DEBUG('New Wireguard Keys generated successfully.');
      }
      WG_DEBUG(`Starting Wireguard Interface ${wgInterface.name}...`);
      await this.#saveWireguardConfig(wgInterface.name);
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
      await this.#syncWireguardConfig(wgInterface.name);
      WG_DEBUG(`Wireguard Interface ${wgInterface.name} started successfully.`);
    }

    WG_DEBUG('Starting Cron Job...');
    await this.startCronJob();
    WG_DEBUG('Cron Job started successfully.');
  }

  // TODO: handle as worker_thread
  async startCronJob() {
    await this.cronJob().catch((err) => {
      WG_DEBUG('Running Cron Job failed.');
      console.error(err);
    });
    setTimeout(() => {
      this.startCronJob();
    }, 60 * 1000);
  }

  // Shutdown wireguard
  async Shutdown() {
    const wgInterfaces = await Database.interfaces.getAll();
    for (const wgInterface of wgInterfaces) {
      await wg.down(wgInterface.name).catch(() => {});
    }
  }

  async cronJob() {
    const clients = await Database.clients.getAll();
    // Expires Feature
    for (const client of clients) {
      if (client.enabled !== true) continue;
      if (
        client.expiresAt !== null &&
        new Date() > new Date(client.expiresAt)
      ) {
        WG_DEBUG(`Client ${client.id} expired.`);
        await Database.clients.toggle(client.id, false);
      }
    }

    // One Time Link Feature
    for (const client of clients) {
      if (
        client.oneTimeLink !== null &&
        new Date() > new Date(client.oneTimeLink.expiresAt)
      ) {
        WG_DEBUG(`Client ${client.id} One Time Link expired.`);
        await Database.oneTimeLinks.delete(client.id);
      }
    }

    await this.saveConfig();
  }
}

export default new WireGuard();
