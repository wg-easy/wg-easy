import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

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
  // configuration in /etc/wireguard for syncconf, shutdown and external tools.
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

  down: async (infName: string) => {
    const name = parseInterfaceName(infName);
    const interfaces = await exec(`${wgExecutable} show interfaces`);
    if (interfaces.split(/\s+/).includes(name)) {
      await exec(`${wgExecutable}-quick down ${name}`);
    }
  },

  postUp: (infName: string, table: string, hook: string) => {
    const name = parseInterfaceName(infName);
    // awg-quick strips config comments before handing the hook to Bash.
    const script = wgExecutable === 'awg' ? hook.split('#', 1)[0]! : hook;
    return exec(
      `set -eo pipefail\nshopt -s extglob\n${script.replaceAll('%i', name)}`,
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

  sync: (infName: string) => {
    // wg-quick's automatic routing mark exists only on the live interface.
    // Supply it as an interface setting in the same update as the peers.
    return exec(
      `fwmark=$(${wgExecutable} show ${infName} fwmark) && ` +
        `config=$(${wgExecutable}-quick strip ${infName}) && ` +
        `printf '%s\\n' '[Interface]' "FwMark = $fwmark" "$config" | ` +
        `${wgExecutable} syncconf ${infName} /dev/stdin`
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
