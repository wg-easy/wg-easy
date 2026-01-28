import fs from 'node:fs/promises';
import debug from 'debug';
import { encodeQR } from 'qr';
import type { NitroApp } from 'nitropack/types';
import type { InterfaceType } from '#db/repositories/interface/types';
import type { ClientType } from '#db/repositories/client/types';
import { isIPv6 } from 'is-ip';
import { parseIpAndPort } from './ip';
import { exec } from './cmd';
import { WG_ENV } from './config';

const WG_DEBUG = debug('WireGuard');

const generateRandomHeaderValue = () =>
  Math.floor(Math.random() * 2147483642) + 5;

class WireGuard {
  private _nitroApp: NitroApp | null = null;

  private get nitroApp(): NitroApp {
    if (!this._nitroApp) {
      this._nitroApp = useNitroApp();
    }
    return this._nitroApp;
  }
  // 注册事件监听器，监听客户端配置保存后的事件
  /**
   * Save and sync config
   */
  async saveConfig() {
    const wgInterface = await Database.interfaces.get();
    await this.#saveWireguardConfig(wgInterface);
    await this.#syncWireguardConfig(wgInterface);
    await this.#syncFirewallRules();
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

  /**
   * Generates iptables rules for a specific client based on their allowed IPs.
   *
   * @param client - The client configuration
   * @returns Array of iptables command strings
   */
  #generateClientIptablesRules(
    client: Omit<ClientType, 'createdAt' | 'updatedAt'>
  ): string[] {
    const rules: string[] = [];

    // Extract IP addresses from client configuration (remove CIDR prefix)
    const clientIp = client.ipv4Address.split('/')[0];
    const clientIpv6 = client.ipv6Address?.split('/')[0];

    // Generate rules for each allowed IP if configured
    if (client.allowedIps && client.allowedIps.length > 0) {
      client.allowedIps.forEach((allowedIpWithPort) => {
        const { ip: allowedIp, port } = parseIpAndPort(allowedIpWithPort);

        if (isIPv6(allowedIp)) {
          // IPv6: generate ip6tables rules
          if (!WG_ENV.DISABLE_IPV6 && clientIpv6) {
            if (port) {
              // TCP port rules
              rules.push(
                `ip6tables -A FORWARD -s ${clientIpv6} -d ${allowedIp} -p tcp --dport ${port} -j ACCEPT`
              );
              rules.push(
                `ip6tables -A FORWARD -d ${clientIpv6} -s ${allowedIp} -p tcp --sport ${port} -j ACCEPT`
              );
              // UDP port rules
              rules.push(
                `ip6tables -A FORWARD -s ${clientIpv6} -d ${allowedIp} -p udp --dport ${port} -j ACCEPT`
              );
              rules.push(
                `ip6tables -A FORWARD -d ${clientIpv6} -s ${allowedIp} -p udp --sport ${port} -j ACCEPT`
              );
            } else {
              // No port restriction - allow all traffic
              rules.push(
                `ip6tables -A FORWARD -s ${clientIpv6} -d ${allowedIp} -j ACCEPT`
              );
              rules.push(
                `ip6tables -A FORWARD -d ${clientIpv6} -s ${allowedIp} -j ACCEPT`
              );
            }
          }
        } else {
          // IPv4: generate iptables rules
          if (port) {
            // TCP port rules
            rules.push(
              `iptables -A FORWARD -s ${clientIp} -d ${allowedIp} -p tcp --dport ${port} -j ACCEPT`
            );
            rules.push(
              `iptables -A FORWARD -d ${clientIp} -s ${allowedIp} -p tcp --sport ${port} -j ACCEPT`
            );
            // UDP port rules
            rules.push(
              `iptables -A FORWARD -s ${clientIp} -d ${allowedIp} -p udp --dport ${port} -j ACCEPT`
            );
            rules.push(
              `iptables -A FORWARD -d ${clientIp} -s ${allowedIp} -p udp --sport ${port} -j ACCEPT`
            );
          } else {
            // No port restriction - allow all traffic
            rules.push(
              `iptables -A FORWARD -s ${clientIp} -d ${allowedIp} -j ACCEPT`
            );
            rules.push(
              `iptables -A FORWARD -d ${clientIp} -s ${allowedIp} -j ACCEPT`
            );
          }
        }
      });
    } else {
      // Default: allow access to server only when no allowed IPs configured
      const serverIps = ['10.8.0.1/32'];
      serverIps.forEach((serverIp) => {
        rules.push(
          `iptables -A FORWARD -s ${clientIp} -d ${serverIp} -j ACCEPT`
        );
        rules.push(
          `iptables -A FORWARD -d ${clientIp} -s ${serverIp} -j ACCEPT`
        );
      });
    }

    return rules;
  }

  /**
   * Removes FORWARD chain rules from hook commands.
   *
   * @param rule - The hook rule string
   * @returns Filtered rule string without FORWARD rules
   */
  async #removeForwardRule(rule: string): Promise<string> {
    try {
      const filteredRules = rule.split(';').filter((line) => {
        return !/FORWARD/i.test(line);
      });
      return filteredRules.join(';');
    } catch (error) {
      console.error('Error removing default FORWARD rule:', error);
    }
    return rule;
  }

  /**
   * Applies all client-specific iptables rules.
   * Clears existing rules and sets up new ones based on current client configuration.
   */
  async #syncFirewallRules() {
    try {
      WG_DEBUG('Syncing firewall rules...');

      // Fetch all clients from database
      const clients = await Database.clients.getAll();

      // Flush existing FORWARD chain rules
      await exec('iptables -F FORWARD');
      if (!WG_ENV.DISABLE_IPV6) {
        await exec('ip6tables -F FORWARD');
      }

      // Set default FORWARD policy to DROP (block all traffic by default)
      await exec('iptables -P FORWARD DROP');
      if (!WG_ENV.DISABLE_IPV6) {
        await exec('ip6tables -P FORWARD DROP');
      }

      // Generate and apply rules for each enabled client
      const includedClients: string[] = [];
      for (const client of clients) {
        if (!client.enabled) {
          WG_DEBUG(`Skipping disabled client: ${client.name}`);
          continue;
        }
        const rules = this.#generateClientIptablesRules(client);
        for (const rule of rules) {
          await exec(rule);
        }

        includedClients.push(client.name);
        WG_DEBUG(`Applied firewall rules for client: ${client.name}`);
      }

      WG_DEBUG(
        `Applied firewall rules for ${includedClients.length} enabled clients`
      );
    } catch (error) {
      console.error('Error syncing firewall rules:', error);
      throw error;
    }
  }

  /**
   * Initializes traffic restriction by removing default FORWARD allow rules
   * from hook commands. Should be called once during first startup.
   */
  async #initializeTrafficRestriction() {
    try {
      const hooks = await Database.hooks.get();

      // Remove default FORWARD allow rules from hooks
      const updatedHooks = {
        ...hooks,
        postUp: await this.#removeForwardRule(hooks.postUp),
        postDown: await this.#removeForwardRule(hooks.postDown),
      };

      // Update hooks in database
      await Database.hooks.update(updatedHooks);
      WG_DEBUG('Removed default FORWARD rules from hooks');
    } catch (error) {
      console.error('Error initializing traffic restriction:', error);
    }
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
    const ECMode = ['high', 'quartile', 'medium', 'low'] as const;
    for (const ecc of ECMode) {
      try {
        return encodeQR(config, 'svg', {
          ecc,
          scale: 2,
          encoding: 'byte',
        });
      } catch (err) {
        if (!(err instanceof Error && err.message === 'Capacity overflow')) {
          throw err;
        }
        // retry with lower ecc
      }
    }
    throw new Error(
      'Failed to generate QR code: Capacity overflow at all ECC levels'
    );
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

    if (wgInterface.h1 === 0) {
      WG_DEBUG('Generating random AmneziaWG obfuscation parameters...');
      const headers = new Set<number>();

      while (headers.size < 4) {
        headers.add(generateRandomHeaderValue());
      }
      const [h1, h2, h3, h4] = Array.from(headers);

      wgInterface.h1 = h1!;
      wgInterface.h2 = h2!;
      wgInterface.h3 = h3!;
      wgInterface.h4 = h4!;

      Database.interfaces.update(wgInterface);
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


    // Initialize firewall rules (only run once during first startup)
    await this.#initializeTrafficRestriction();
    await this.#syncFirewallRules();

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
