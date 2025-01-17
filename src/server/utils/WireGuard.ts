import fs from 'node:fs/promises';
import debug from 'debug';
import QRCode from 'qrcode';
import type { ID } from '#db/schema';

const DEBUG = debug('WireGuard');

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

    DEBUG('Saving Config...');
    await fs.writeFile(`/etc/wireguard/${infName}.conf`, result.join('\n\n'), {
      mode: 0o600,
    });
    DEBUG('Config saved successfully.');
  }

  async #syncWireguardConfig(infName: string) {
    DEBUG('Syncing Config...');
    await wg.sync(infName);
    DEBUG('Config synced successfully.');
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
        DEBUG('Generating new Wireguard Keys...');
        const privateKey = await wg.generatePrivateKey();
        const publicKey = await wg.getPublicKey(privateKey);

        await Database.interfaces.updateKeyPair(
          wgInterface.name,
          privateKey,
          publicKey
        );
        DEBUG('New Wireguard Keys generated successfully.');
      }
      DEBUG(`Starting Wireguard Interface ${wgInterface.name}...`);
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
      DEBUG(`Wireguard Interface ${wgInterface.name} started successfully.`);
    }

    DEBUG('Starting Cron Job.');
    await this.startCronJob();
    DEBUG('Cron Job started successfully.');
  }

  // TODO: handle as worker_thread
  async startCronJob() {
    await this.cronJob().catch((err) => {
      DEBUG('Running Cron Job failed.');
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
        DEBUG(`Client ${client.id} expired.`);
        await Database.clients.toggle(client.id, false);
      }
    }

    // One Time Link Feature
    for (const client of clients) {
      if (
        client.oneTimeLink !== null &&
        new Date() > new Date(client.oneTimeLink.expiresAt)
      ) {
        DEBUG(`Client ${client.id} One Time Link expired.`);
        await Database.oneTimeLinks.delete(client.id);
      }
    }

    await this.saveConfig();
  }

  async getMetrics() {
    const clients = await this.getClients();
    let wireguardPeerCount = 0;
    let wireguardEnabledPeersCount = 0;
    let wireguardConnectedPeersCount = 0;
    let wireguardSentBytes = '';
    let wireguardReceivedBytes = '';
    let wireguardLatestHandshakeSeconds = '';
    for (const client of clients) {
      wireguardPeerCount++;
      if (client.enabled === true) {
        wireguardEnabledPeersCount++;
      }
      if (client.endpoint !== null) {
        wireguardConnectedPeersCount++;
      }
      wireguardSentBytes += `wireguard_sent_bytes{interface="wg0",enabled="${client.enabled}",ipv4Address="${client.ipv4Address}",ipv6Address="${client.ipv6Address}",name="${client.name}"} ${Number(client.transferTx)}\n`;
      wireguardReceivedBytes += `wireguard_received_bytes{interface="wg0",enabled="${client.enabled}",ipv4Address="${client.ipv4Address}",ipv6Address="${client.ipv6Address}",name="${client.name}"} ${Number(client.transferRx)}\n`;
      wireguardLatestHandshakeSeconds += `wireguard_latest_handshake_seconds{interface="wg0",enabled="${client.enabled}",ipv4Address="${client.ipv4Address}",ipv6Address="${client.ipv6Address}",name="${client.name}"} ${client.latestHandshakeAt ? (new Date().getTime() - new Date(client.latestHandshakeAt).getTime()) / 1000 : 0}\n`;
    }

    let returnText = '# HELP wg-easy and wireguard metrics\n';

    returnText += '\n# HELP wireguard_configured_peers\n';
    returnText += '# TYPE wireguard_configured_peers gauge\n';
    returnText += `wireguard_configured_peers{interface="wg0"} ${wireguardPeerCount}\n`;

    returnText += '\n# HELP wireguard_enabled_peers\n';
    returnText += '# TYPE wireguard_enabled_peers gauge\n';
    returnText += `wireguard_enabled_peers{interface="wg0"} ${wireguardEnabledPeersCount}\n`;

    returnText += '\n# HELP wireguard_connected_peers\n';
    returnText += '# TYPE wireguard_connected_peers gauge\n';
    returnText += `wireguard_connected_peers{interface="wg0"} ${wireguardConnectedPeersCount}\n`;

    returnText += '\n# HELP wireguard_sent_bytes Bytes sent to the peer\n';
    returnText += '# TYPE wireguard_sent_bytes counter\n';
    returnText += `${wireguardSentBytes}`;

    returnText +=
      '\n# HELP wireguard_received_bytes Bytes received from the peer\n';
    returnText += '# TYPE wireguard_received_bytes counter\n';
    returnText += `${wireguardReceivedBytes}`;

    returnText +=
      '\n# HELP wireguard_latest_handshake_seconds UNIX timestamp seconds of the last handshake\n';
    returnText += '# TYPE wireguard_latest_handshake_seconds gauge\n';
    returnText += `${wireguardLatestHandshakeSeconds}`;

    return returnText;
  }

  async getMetricsJSON() {
    const clients = await this.getClients();
    let wireguardPeerCount = 0;
    let wireguardEnabledPeersCount = 0;
    let wireguardConnectedPeersCount = 0;
    for (const client of clients) {
      wireguardPeerCount++;
      if (client.enabled === true) {
        wireguardEnabledPeersCount++;
      }
      if (client.endpoint !== null) {
        wireguardConnectedPeersCount++;
      }
    }
    return {
      wireguard_configured_peers: wireguardPeerCount,
      wireguard_enabled_peers: wireguardEnabledPeersCount,
      wireguard_connected_peers: wireguardConnectedPeersCount,
    };
  }
}

export default new WireGuard();
