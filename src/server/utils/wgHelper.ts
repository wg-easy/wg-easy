import fs from 'node:fs/promises';

import { exec } from '#server/utils/cmd';
import { WG_ENV } from '#server/utils/config';
import { parseInterfaceName } from '#server/utils/interfaceName';

const wgExecutable = WG_ENV.WG_EXECUTABLE;

async function up(infName: string, startupConfig?: string) {
  const name = parseInterfaceName(infName);
  if (startupConfig === undefined) {
    return exec(`${wgExecutable}-quick up ${name}`);
  }
  // wg-quick derives the interface name from the filename. Keep the complete
  // configuration in /etc/wireguard for syncconf, shutdown and external tools.
  const dir = await fs.mkdtemp('/tmp/wg-easy-up-');
  try {
    const path = `${dir}/${name}.conf`;
    await fs.writeFile(path, startupConfig, { mode: 0o600 });
    return await exec(`${wgExecutable}-quick up ${path}`);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export const wg = {
  generatePrivateKey: () => {
    return exec(`${wgExecutable} genkey`);
  },

  getPublicKey: (privateKey: string) => {
    return exec(`echo ${privateKey} | ${wgExecutable} pubkey`, {
      log: `echo ***hidden*** | ${wgExecutable} pubkey`,
    });
  },

  generatePreSharedKey: () => {
    return exec(`${wgExecutable} genpsk`);
  },

  up,

  down: (infName: string) => {
    return exec(`${wgExecutable}-quick down ${infName}`);
  },

  restart: async (infName: string, startupConfig?: string) => {
    await wg.down(infName).catch(() => {});
    return up(infName, startupConfig);
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
