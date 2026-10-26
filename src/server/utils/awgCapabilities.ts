import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { buildAwgLines, interfaceAwgParameters } from '#server/utils/awg';
import type { AwgProfile } from '#server/utils/awgProfile';

export type AwgCommand = (file: string, args: string[]) => Promise<string>;
const execFileAsync = promisify(execFile);
const runCommand: AwgCommand = async (file, args) => {
  const { stdout } = await execFileAsync(file, args, {
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 64 * 1024,
  });
  return stdout;
};

async function removeProbe(name: string, run: AwgCommand) {
  try {
    await run('ip', ['link', 'delete', 'dev', name]);
  } catch {
    throw new Error(`Cannot remove temporary AWG capability interface ${name}`);
  }
}

/** Verify 3.1 parameters without bringing up or addressing a VPN interface. */
export async function verifyAwgProfileSupport(
  profile: AwgProfile,
  run: AwgCommand = runCommand
) {
  const name = `awgp${randomBytes(5).toString('hex')}`;
  const directory = await mkdtemp(join(tmpdir(), 'wg-easy-awg-probe-'));
  const file = join(directory, 'probe.conf');
  let created = false;
  try {
    try {
      await run('ip', ['link', 'add', 'dev', name, 'type', 'amneziawg']);
      created = true;
    } catch {
      throw new Error(
        'Cannot create an AWG capability probe. Check NET_ADMIN and the installed amneziawg kernel module.'
      );
    }
    const parameters = interfaceAwgParameters(profile.parameters);
    // Older modules may silently ignore disabled flags; test the enabled state.
    parameters.DisableCookies = true;
    const lines = buildAwgLines(parameters);
    const peer = [
      '[Peer]',
      `PublicKey = ${randomBytes(32).toString('base64')}`,
      'PersistentKeepalive = 20-30',
    ];
    await writeFile(file, `[Interface]\n${[...lines, ...peer].join('\n')}\n`, {
      mode: 0o600,
    });
    let supported = false;
    try {
      await run('awg', ['setconf', name, file]);
      const readback = await run('awg', ['showconf', name]);
      const values = new Map(
        readback.split('\n').map((line) => {
          const index = line.indexOf('=');
          return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
        })
      );
      supported = [...lines, 'PersistentKeepalive = 20-30'].every((line) => {
        const [key, value] = line.split(' = ');
        return values.get(key!) === value;
      });
    } catch {
      /* Tool errors can include the generated key; do not expose them. */
    }
    if (!supported)
      throw new Error(
        'AWG_AUTO_GENERATE requires awg tools and a kernel module supporting AmneziaWG 3.1 parameters'
      );
  } finally {
    try {
      if (created) await removeProbe(name, run);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
