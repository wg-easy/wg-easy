import fs from 'node:fs/promises';
import debug from 'debug';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import CRC32 from 'crc-32';

import type { NewClient } from '~~/services/database/repositories/client';
import { isIPv4 } from 'is-ip';

const DEBUG = debug('WireGuard');

class WireGuard {
  /**
   * Save and sync config
   */
  async saveConfig() {
    await this.#saveWireguardConfig();
    await this.#syncWireguardConfig();
  }

  /**
   * Generates and saves WireGuard config from database as wg0
   */
  async #saveWireguardConfig() {
    const system = await Database.system.get();
    const clients = await Database.client.findAll();
    const result = [];
    result.push(wg.generateServerInterface(system));

    for (const client of Object.values(clients)) {
      if (!client.enabled) {
        continue;
      }
      result.push(wg.generateServerPeer(client));
    }

    DEBUG('Saving Config...');
    await fs.writeFile('/etc/wireguard/wg0.conf', result.join('\n\n'), {
      mode: 0o600,
    });
    DEBUG('Config saved successfully.');
  }

  async #syncWireguardConfig() {
    DEBUG('Syncing Config...');
    await wg.sync();
    DEBUG('Config synced successfully.');
  }

  async getClients() {
    const dbClients = await Database.client.findAll();
    const clients = Object.entries(dbClients).map(([clientId, client]) => ({
      id: clientId,
      name: client.name,
      enabled: client.enabled,
      address4: client.address4,
      address6: client.address6,
      publicKey: client.publicKey,
      createdAt: new Date(client.createdAt),
      updatedAt: new Date(client.updatedAt),
      expiresAt: client.expiresAt,
      allowedIPs: client.allowedIPs,
      oneTimeLink: client.oneTimeLink,
      persistentKeepalive: null as string | null,
      latestHandshakeAt: null as Date | null,
      endpoint: null as string | null,
      transferRx: null as number | null,
      transferTx: null as number | null,
    }));

    // Loop WireGuard status
    const dump = await wg.dump();
    dump.forEach(
      ({
        publicKey,
        latestHandshakeAt,
        endpoint,
        transferRx,
        transferTx,
        persistentKeepalive,
      }) => {
        const client = clients.find((client) => client.publicKey === publicKey);
        if (!client) {
          return;
        }

        client.latestHandshakeAt = latestHandshakeAt;
        client.endpoint = endpoint;
        client.transferRx = transferRx;
        client.transferTx = transferTx;
        client.persistentKeepalive = persistentKeepalive;
      }
    );

    return clients;
  }

  async getClient({ clientId }: { clientId: string }) {
    const client = await Database.client.findById(clientId);
    if (!client) {
      throw createError({
        statusCode: 404,
        statusMessage: `Client Not Found: ${clientId}`,
      });
    }

    return client;
  }

  async getClientConfiguration({ clientId }: { clientId: string }) {
    const system = await Database.system.get();
    const client = await this.getClient({ clientId });

    return wg.generateClientConfig(system, client);
  }

  async getClientQRCodeSVG({ clientId }: { clientId: string }) {
    const config = await this.getClientConfiguration({ clientId });
    return QRCode.toString(config, {
      type: 'svg',
      width: 512,
    });
  }

  async createClient({
    name,
    expireDate,
  }: {
    name: string;
    expireDate: string | null;
  }) {
    const system = await Database.system.get();
    const clients = await Database.client.findAll();

    const privateKey = await wg.generatePrivateKey();
    const publicKey = await wg.getPublicKey(privateKey);
    const preSharedKey = await wg.generatePresharedKey();

    const address4 = nextIPv4(system, clients);

    const address6 = nextIPv6(system, clients);

    // Create Client
    const id = crypto.randomUUID();

    const client: NewClient = {
      id,
      name,
      address4,
      address6,
      privateKey,
      publicKey,
      preSharedKey,
      oneTimeLink: null,
      expiresAt: null,
      enabled: true,
      allowedIPs: [...system.userConfig.allowedIps],
      serverAllowedIPs: null,
      persistentKeepalive: system.userConfig.persistentKeepalive,
      mtu: system.userConfig.mtu,
    };

    if (expireDate) {
      const date = new Date(expireDate);
      date.setHours(23);
      date.setMinutes(59);
      date.setSeconds(59);
      client.expiresAt = date.toISOString();
    }

    await Database.client.create(client);

    await this.saveConfig();

    return client;
  }

  async deleteClient({ clientId }: { clientId: string }) {
    await Database.client.delete(clientId);
    await this.saveConfig();
  }

  async enableClient({ clientId }: { clientId: string }) {
    await Database.client.toggle(clientId, true);

    await this.saveConfig();
  }

  async generateOneTimeLink({ clientId }: { clientId: string }) {
    const key = `${clientId}-${Math.floor(Math.random() * 1000)}`;
    const oneTimeLink = Math.abs(CRC32.str(key)).toString(16);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await Database.client.createOneTimeLink(clientId, {
      oneTimeLink,
      expiresAt,
    });
    await this.saveConfig();
  }

  async eraseOneTimeLink({ clientId }: { clientId: string }) {
    await Database.client.deleteOneTimeLink(clientId);
    await this.saveConfig();
  }

  async disableClient({ clientId }: { clientId: string }) {
    await Database.client.toggle(clientId, false);

    await this.saveConfig();
  }

  async updateClientName({
    clientId,
    name,
  }: {
    clientId: string;
    name: string;
  }) {
    await Database.client.updateName(clientId, name);

    await this.saveConfig();
  }

  async updateClientAddress({
    clientId,
    address4,
  }: {
    clientId: string;
    address4: string;
  }) {
    if (!isIPv4(address4)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid Address: ${address4}`,
      });
    }

    await Database.client.updateAddress4(clientId, address4);

    await this.saveConfig();
  }

  async updateClientExpireDate({
    clientId,
    expireDate,
  }: {
    clientId: string;
    expireDate: string | null;
  }) {
    let updatedDate: string | null = null;

    if (expireDate) {
      const date = new Date(expireDate);
      date.setHours(23);
      date.setMinutes(59);
      date.setSeconds(59);
      updatedDate = date.toISOString();
    }

    await Database.client.updateExpirationDate(clientId, updatedDate);

    await this.saveConfig();
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
    DEBUG('Starting Wireguard...');
    await this.#saveWireguardConfig();
    await wg.down().catch(() => {});
    await wg.up().catch((err) => {
      if (
        err &&
        err.message &&
        err.message.includes('Cannot find device "wg0"')
      ) {
        throw new Error(
          'WireGuard exited with the error: Cannot find device "wg0"\nThis usually means that your host\'s kernel does not support WireGuard!'
        );
      }

      throw err;
    });
    await this.#syncWireguardConfig();
    DEBUG('Wireguard started successfully.');

    DEBUG('Starting Cron Job.');
    await this.startCronJob();
    DEBUG('Cron Job started successfully.');
  }

  // TODO: handle as worker_thread
  // would need a better database aswell
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
    await wg.down().catch(() => {});
  }

  async cronJob() {
    const clients = await Database.client.findAll();
    // Expires Feature
    for (const client of Object.values(clients)) {
      if (client.enabled !== true) continue;
      if (
        client.expiresAt !== null &&
        new Date() > new Date(client.expiresAt)
      ) {
        DEBUG(`Client ${client.id} expired.`);
        await Database.client.toggle(client.id, false);
      }
    }

    // One Time Link Feature
    for (const client of Object.values(clients)) {
      if (
        client.oneTimeLink !== null &&
        new Date() > new Date(client.oneTimeLink.expiresAt)
      ) {
        DEBUG(`Client ${client.id} One Time Link expired.`);
        await Database.client.deleteOneTimeLink(client.id);
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
    for (const client of Object.values(clients)) {
      wireguardPeerCount++;
      if (client.enabled === true) {
        wireguardEnabledPeersCount++;
      }
      if (client.endpoint !== null) {
        wireguardConnectedPeersCount++;
      }
      wireguardSentBytes += `wireguard_sent_bytes{interface="wg0",enabled="${client.enabled}",address4="${client.address4}",address6="${client.address6}",name="${client.name}"} ${Number(client.transferTx)}\n`;
      wireguardReceivedBytes += `wireguard_received_bytes{interface="wg0",enabled="${client.enabled}",address4="${client.address4}",address6="${client.address6}",name="${client.name}"} ${Number(client.transferRx)}\n`;
      wireguardLatestHandshakeSeconds += `wireguard_latest_handshake_seconds{interface="wg0",enabled="${client.enabled}",address4="${client.address4}",address6="${client.address6}",name="${client.name}"} ${client.latestHandshakeAt ? (new Date().getTime() - new Date(client.latestHandshakeAt).getTime()) / 1000 : 0}\n`;
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
    for (const client of Object.values(clients)) {
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
