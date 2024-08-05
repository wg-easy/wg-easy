import fs from 'node:fs/promises';
import path from 'path';
import debug_logger from 'debug';
import crypto from 'node:crypto';
import QRCode from 'qrcode';

const debug = debug_logger('WireGuard');

class ServerError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

type Server = {
  privateKey: string;
  publicKey: string;
  address: string;
};

type Client = {
  enabled: boolean;
  name: string;
  publicKey: string;
  privateKey: string;
  preSharedKey: string;
  address: string;
  createdAt: number;
  updatedAt: Date;
  allowedIPs?: string[];
};

type Config = {
  server: Server;
  clients: Record<string, Client>;
};

class WireGuard {
  async __buildConfig() {
    if (!WG_HOST) {
      throw new Error('WG_HOST Environment Variable Not Set!');
    }

    debug('Loading configuration...');
    try {
      const config = await fs.readFile(path.join(WG_PATH, 'wg0.json'), 'utf8');
      const parsedConfig = JSON.parse(config);
      debug('Configuration loaded.');
      return parsedConfig as Config;
    } catch {
      const privateKey = await exec('wg genkey');
      const publicKey = await exec(`echo ${privateKey} | wg pubkey`, {
        log: 'echo ***hidden*** | wg pubkey',
      });
      const address = WG_DEFAULT_ADDRESS.replace('x', '1');

      const config: Config = {
        server: {
          privateKey,
          publicKey,
          address,
        },
        clients: {},
      };
      debug('Configuration generated.');
      return config;
    }
  }

  async getConfig(): Promise<Config> {
    const config = await this.__buildConfig();

    await this.__saveConfig(config);
    await exec('wg-quick down wg0').catch(() => {});
    await exec('wg-quick up wg0').catch((err) => {
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
    // await Util.exec(`iptables -t nat -A POSTROUTING -s ${WG_DEFAULT_ADDRESS.replace('x', '0')}/24 -o ' + WG_DEVICE + ' -j MASQUERADE`);
    // await Util.exec('iptables -A INPUT -p udp -m udp --dport 51820 -j ACCEPT');
    // await Util.exec('iptables -A FORWARD -i wg0 -j ACCEPT');
    // await Util.exec('iptables -A FORWARD -o wg0 -j ACCEPT');
    await this.__syncConfig();
    return config;
  }

  async saveConfig() {
    const config = await this.getConfig();
    await this.__saveConfig(config);
    await this.__syncConfig();
  }

  async __saveConfig(config: Config) {
    let result = `
# Note: Do not edit this file directly.
# Your changes will be overwritten!

# Server
[Interface]
PrivateKey = ${config.server.privateKey}
Address = ${config.server.address}/24
ListenPort = ${WG_PORT}
PreUp = ${WG_PRE_UP}
PostUp = ${WG_POST_UP}
PreDown = ${WG_PRE_DOWN}
PostDown = ${WG_POST_DOWN}
`;

    for (const [clientId, client] of Object.entries(config.clients)) {
      if (!client.enabled) continue;

      result += `

# Client: ${client.name} (${clientId})
[Peer]
PublicKey = ${client.publicKey}
${
  client.preSharedKey ? `PresharedKey = ${client.preSharedKey}\n` : ''
}AllowedIPs = ${client.address}/32`;
    }

    debug('Config saving...');
    await fs.writeFile(
      path.join(WG_PATH, 'wg0.json'),
      JSON.stringify(config, undefined, 2),
      {
        mode: 0o660,
      }
    );
    await fs.writeFile(path.join(WG_PATH, 'wg0.conf'), result, {
      mode: 0o600,
    });
    debug('Config saved.');
  }

  async __syncConfig() {
    debug('Config syncing...');
    await exec('wg syncconf wg0 <(wg-quick strip wg0)');
    debug('Config synced.');
  }

  async getClients() {
    const config = await this.getConfig();
    const clients = Object.entries(config.clients).map(
      ([clientId, client]) => ({
        id: clientId,
        name: client.name,
        enabled: client.enabled,
        address: client.address,
        publicKey: client.publicKey,
        createdAt: new Date(client.createdAt),
        updatedAt: new Date(client.updatedAt),
        allowedIPs: client.allowedIPs,
        downloadableConfig: 'privateKey' in client,
        persistentKeepalive: null,
        latestHandshakeAt: null,
        transferRx: null,
        transferTx: null,
      })
    );

    // Loop WireGuard status
    const dump = await exec('wg show wg0 dump', {
      log: false,
    });
    dump
      .trim()
      .split('\n')
      .slice(1)
      .forEach((line) => {
        const [
          publicKey,
          _preSharedKey,
          _endpoint,
          _allowedIps,
          latestHandshakeAt,
          transferRx,
          transferTx,
          persistentKeepalive,
        ] = line.split('\t');

        const client = clients.find((client) => client.publicKey === publicKey);
        if (!client) return;

        client.latestHandshakeAt =
          latestHandshakeAt === '0'
            ? null
            : new Date(Number(`${latestHandshakeAt}000`));
        client.transferRx = Number(transferRx);
        client.transferTx = Number(transferTx);
        client.persistentKeepalive = persistentKeepalive;
      });

    return clients;
  }

  async getClient({ clientId }: { clientId: string }) {
    const config = await this.getConfig();
    const client = config.clients[clientId];
    if (!client) {
      throw new ServerError(`Client Not Found: ${clientId}`, 404);
    }

    return client;
  }

  async getClientConfiguration({ clientId }: { clientId: string }) {
    const config = await this.getConfig();
    const client = await this.getClient({ clientId });

    return `
[Interface]
PrivateKey = ${client.privateKey ? `${client.privateKey}` : 'REPLACE_ME'}
Address = ${client.address}/24
${WG_DEFAULT_DNS ? `DNS = ${WG_DEFAULT_DNS}\n` : ''}\
${WG_MTU ? `MTU = ${WG_MTU}\n` : ''}\

[Peer]
PublicKey = ${config.server.publicKey}
${
  client.preSharedKey ? `PresharedKey = ${client.preSharedKey}\n` : ''
}AllowedIPs = ${WG_ALLOWED_IPS}
PersistentKeepalive = ${WG_PERSISTENT_KEEPALIVE}
Endpoint = ${WG_HOST}:${WG_CONFIG_PORT}`;
  }

  async getClientQRCodeSVG({ clientId }: { clientId: string }) {
    const config = await this.getClientConfiguration({ clientId });
    return QRCode.toString(config, {
      type: 'svg',
      width: 512,
    });
  }

  async createClient({ name }: { name: string }) {
    if (!name) {
      throw new Error('Missing: Name');
    }

    const config = await this.getConfig();

    const privateKey = await exec('wg genkey');
    const publicKey = await exec(`echo ${privateKey} | wg pubkey`, {
      log: 'echo ***hidden*** | wg pubkey',
    });
    const preSharedKey = await exec('wg genpsk');

    // Calculate next IP
    let address;
    for (let i = 2; i < 255; i++) {
      const client = Object.values(config.clients).find((client) => {
        return client.address === WG_DEFAULT_ADDRESS.replace('x', i);
      });

      if (!client) {
        address = WG_DEFAULT_ADDRESS.replace('x', i);
        break;
      }
    }

    if (!address) {
      throw new Error('Maximum number of clients reached.');
    }

    // Create Client
    const id = crypto.randomUUID();
    const client = {
      id,
      name,
      address,
      privateKey,
      publicKey,
      preSharedKey,

      createdAt: new Date(),
      updatedAt: new Date(),

      enabled: true,
    };

    config.clients[id] = client;

    await this.saveConfig();

    return client;
  }

  async deleteClient({ clientId }: { clientId: string }) {
    const config = await this.getConfig();

    if (config.clients[clientId]) {
      delete config.clients[clientId];
      await this.saveConfig();
    }
  }

  async enableClient({ clientId }: { clientId: string }) {
    const client = await this.getClient({ clientId });

    client.enabled = true;
    client.updatedAt = new Date();

    await this.saveConfig();
  }

  async disableClient({ clientId }: { clientId: string }) {
    const client = await this.getClient({ clientId });

    client.enabled = false;
    client.updatedAt = new Date();

    await this.saveConfig();
  }

  async updateClientName({
    clientId,
    name,
  }: {
    clientId: string;
    name: string;
  }) {
    const client = await this.getClient({ clientId });

    client.name = name;
    client.updatedAt = new Date();

    await this.saveConfig();
  }

  async updateClientAddress({
    clientId,
    address,
  }: {
    clientId: string;
    address: string;
  }) {
    const client = await this.getClient({ clientId });

    if (!isValidIPv4(address)) {
      throw new ServerError(`Invalid Address: ${address}`, 400);
    }

    client.address = address;
    client.updatedAt = new Date();

    await this.saveConfig();
  }

  async __reloadConfig() {
    await this.__buildConfig();
    await this.__syncConfig();
  }

  async restoreConfiguration(config: string) {
    debug('Starting configuration restore process.');
    const _config = JSON.parse(config);
    await this.__saveConfig(_config);
    await this.__reloadConfig();
    debug('Configuration restore process completed.');
  }

  async backupConfiguration() {
    debug('Starting configuration backup.');
    const config = await this.getConfig();
    const backup = JSON.stringify(config, null, 2);
    debug('Configuration backup completed.');
    return backup;
  }

  // Shutdown wireguard
  async Shutdown() {
    await exec('wg-quick down wg0').catch(() => {});
  }
}

export default new WireGuard();
