import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

import type { InterfaceType } from '#db/repositories/interface/types';
import {
  generateTunnelConfig,
  type ServerPeer,
} from '#server/features/vpn/configuration';
import { exec } from '#server/utils/cmd';
import { WG_ENV } from '#server/utils/config';
import { parseInterfaceName } from '#server/utils/interfaceName';

const wgExecutable = WG_ENV.WG_EXECUTABLE;

export class NativePostUpError extends Error {}

async function up(
  infName: string,
  config?: { contents: string; nativePostUp?: boolean }
) {
  const name = parseInterfaceName(infName);
  if (!config) {
    return exec(`${wgExecutable}-quick up ${name}`);
  }
  // wg-quick derives the interface name from the filename. Keep the complete
  // configuration in /etc/wireguard for shutdown and external tools.
  const dir = await fs.mkdtemp('/tmp/wg-easy-up-');
  const marker = `${dir}/post-up-started`;
  try {
    const path = `${dir}/${name}.conf`;
    // Native hooks still see the persistent file and wg-quick's shell functions.
    // Mark entry into PostUp so failures during earlier setup can be retried.
    const contents = config.nativePostUp
      ? config.contents.replace(
          /^(PreUp|PostUp) = (?=.)/gm,
          (field, phase) =>
            `${field}CONFIG_FILE=/etc/wireguard/${name}.conf; ${phase === 'PostUp' ? `: > ${marker}; ` : ''}`
        )
      : config.contents;
    await fs.writeFile(path, contents, { mode: 0o600 });
    return await exec(`${wgExecutable}-quick up ${path}`);
  } catch (cause) {
    if (config.nativePostUp && existsSync(marker)) {
      throw new NativePostUpError('PostUp failed', { cause });
    }
    throw cause;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export const wg = {
  async generateKeyPair() {
    const privateKey = await exec(`${wgExecutable} genkey`);
    const publicKey = await exec(
      `echo ${privateKey} | ${wgExecutable} pubkey`,
      {
        log: `echo ***hidden*** | ${wgExecutable} pubkey`,
      }
    );
    return { privateKey, publicKey };
  },

  generatePreSharedKey: () => {
    return exec(`${wgExecutable} genpsk`);
  },

  up,

  down: async (infName: string, failedStart?: { routingTable: string }) => {
    const name = parseInterfaceName(infName);
    const interfaces = await exec(`${wgExecutable} show interfaces`);
    if (!interfaces.split(/\s+/).includes(name)) {
      return;
    }
    if (!failedStart) {
      await exec(`${wgExecutable}-quick down ${name}`);
      return;
    }
    // Keep quick's default-policy teardown while skipping both down hooks.
    const dir = await fs.mkdtemp('/tmp/wg-easy-cleanup-');
    try {
      const path = `${dir}/${name}.conf`;
      await fs.writeFile(
        path,
        `[Interface]\nTable = ${failedStart.routingTable}\n`,
        {
          mode: 0o600,
        }
      );
      await exec(`${wgExecutable}-quick down ${path}`);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  },

  postUp: (infName: string, table: string, hook: string) => {
    const name = parseInterfaceName(infName);
    return exec(
      `set -eo pipefail
shopt -s extglob
cmd() { echo "[#] $*" >&2; "$@"; }
${hook.replaceAll('%i', name)}`,
      {
        log: false,
        env: {
          ...process.env,
          LC_ALL: 'C',
          INTERFACE: name,
          CONFIG_FILE: `/etc/wireguard/${name}.conf`,
          TABLE: table,
        },
      }
    );
  },

  async sync(
    network: InterfaceType,
    clients: ServerPeer[],
    enableIpv6: boolean
  ) {
    const name = parseInterfaceName(network.name);
    const fwmark = await exec(`${wgExecutable} show ${name} fwmark`);
    const input = generateTunnelConfig(network, clients, fwmark, {
      enableIpv6,
      amnezia: wgExecutable === 'awg',
    });
    // Node uses a socket for child stdin. Give syncconf a pipe it can reopen.
    return exec(
      `set -o pipefail; cat | ${wgExecutable} syncconf ${name} /dev/stdin`,
      { input }
    );
  },

  removePeer: (infName: string, publicKey: string) => {
    // Keys come from the kernel dump, but must still be safe shell arguments.
    if (!/^[A-Za-z0-9+/]{43}=$/.test(publicKey)) {
      throw new Error('Invalid WireGuard public key');
    }
    return exec(`${wgExecutable} set ${infName} peer ${publicKey} remove`);
  },

  dump: async (infName: string) => {
    const rawDump = await exec(`${wgExecutable} show ${infName} dump`, {
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
          allowedIps,
          latestHandshakeAt,
          transferRx,
          transferTx,
          persistentKeepalive,
        ] = splitLines as wgDumpLine;

        return {
          publicKey,
          preSharedKey,
          endpoint: endpoint === '(none)' ? null : endpoint,
          allowedIps,
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
