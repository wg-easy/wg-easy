import { parseCidr } from 'cidr-tools';
import type { DeepReadonly } from 'vue';
import type { Client } from '~~/services/database/repositories/client';
import type { System } from '~~/services/database/repositories/system';

export const wg = {
  generateServerPeer: (client: DeepReadonly<Client>) => {
    const allowedIps = [
      `${client.address4}/32`,
      `${client.address6}/128`,
      ...(client.serverAllowedIPs ?? []),
    ];

    return `# Client: ${client.name} (${client.id})
[Peer]
PublicKey = ${client.publicKey}
PresharedKey = ${client.preSharedKey}
AllowedIPs = ${allowedIps.join(', ')}`;
  },

  generateServerInterface: (system: DeepReadonly<System>) => {
    const cidr4Block = parseCidr(system.userConfig.address4Range).prefix;
    const cidr6Block = parseCidr(system.userConfig.address6Range).prefix;

    return `# Note: Do not edit this file directly.
# Your changes will be overwritten!

# Server
[Interface]
PrivateKey = ${system.interface.privateKey}
Address = ${system.interface.address4}/${cidr4Block}, ${system.interface.address6}/${cidr6Block}
ListenPort = ${system.interface.port}
MTU = ${system.interface.mtu}
PreUp = ${system.iptables.PreUp}
PostUp = ${system.iptables.PostUp}
PreDown = ${system.iptables.PreDown}
PostDown = ${system.iptables.PostDown}`;
  },

  generateClientConfig: (
    system: DeepReadonly<System>,
    client: DeepReadonly<Client>
  ) => {
    const cidr4Block = parseCidr(system.userConfig.address4Range).prefix;
    const cidr6Block = parseCidr(system.userConfig.address6Range).prefix;

    return `[Interface]
PrivateKey = ${client.privateKey}
Address = ${client.address4}/${cidr4Block}, ${client.address6}/${cidr6Block}
DNS = ${system.userConfig.defaultDns.join(', ')}
MTU = ${system.userConfig.mtu}

[Peer]
PublicKey = ${system.interface.publicKey}
PresharedKey = ${client.preSharedKey}
AllowedIPs = ${client.allowedIPs.join(', ')}
PersistentKeepalive = ${client.persistentKeepalive}
Endpoint = ${system.userConfig.host}:${system.userConfig.port}`;
  },

  generatePrivateKey: () => {
    return exec('wg genkey');
  },

  getPublicKey: (privateKey: string) => {
    return exec(`echo ${privateKey} | wg pubkey`, {
      log: 'echo ***hidden*** | wg pubkey',
    });
  },

  generatePresharedKey: () => {
    return exec('wg genpsk');
  },

  up: () => {
    return exec('wg-quick up wg0');
  },

  down: () => {
    return exec('wg-quick down wg0');
  },

  sync: () => {
    return exec('wg syncconf wg0 <(wg-quick strip wg0)');
  },

  dump: async () => {
    const rawDump = await exec('wg show wg0 dump', {
      log: false,
    });

    type wgDumpLine = [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];

    return rawDump
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => {
        const splitLines = line.split('\t');
        const [
          publicKey,
          preSharedKey,
          endpoint,
          allowedIPs,
          latestHandshakeAt,
          transferRx,
          transferTx,
          persistentKeepalive,
        ] = splitLines as wgDumpLine;

        return {
          publicKey,
          preSharedKey,
          endpoint: endpoint === '(none)' ? null : endpoint,
          allowedIPs,
          latestHandshakeAt:
            latestHandshakeAt === '0'
              ? null
              : new Date(Number.parseInt(`${latestHandshakeAt}000`)),
          transferRx: Number.parseInt(transferRx),
          transferTx: Number.parseInt(transferTx),
          persistentKeepalive: persistentKeepalive,
        };
      });
  },
};
