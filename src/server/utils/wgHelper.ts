import { exec } from '#server/utils/cmd';
import { WG_ENV } from '#server/utils/config';

const wgExecutable = WG_ENV.WG_EXECUTABLE;

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

  up: (infName: string) => {
    return exec(`${wgExecutable}-quick up ${infName}`);
  },

  down: (infName: string) => {
    return exec(`${wgExecutable}-quick down ${infName}`);
  },

  restart: (infName: string) => {
    return exec(
      `${wgExecutable}-quick down ${infName}; ${wgExecutable}-quick up ${infName}`
    );
  },

  sync: (infName: string) => {
    return exec(
      `${wgExecutable} syncconf ${infName} <(${wgExecutable}-quick strip ${infName})`
    );
  },

  removePeer: (infName: string, publicKey: string) => {
    // Keys come from the kernel dump, but must still be safe shell arguments.
    if (!/^[A-Za-z0-9+/]{43}=$/.test(publicKey))
      throw new Error('Invalid WireGuard public key');
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
