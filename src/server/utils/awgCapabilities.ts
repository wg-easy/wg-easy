import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { buildAwgLines, interfaceAwgParameters } from '#server/utils/awg';
import { generateAwgProfile } from '#server/utils/awgProfile';
import {
  AWG_VERSIONS,
  type AwgVersion,
  type AwgVersionRequest,
} from '#server/utils/awgProtocol';

const execFileAsync = promisify(execFile);
export type AwgCommand = (file: string, args: string[]) => Promise<string>;
const runCommand: AwgCommand = async (file, args) => {
  const { stdout } = await execFileAsync(file, args, {
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 64 * 1024,
  });
  return stdout.trim();
};

async function removeProbe(name: string, run: AwgCommand) {
  try {
    await run('ip', ['link', 'delete', 'dev', name]);
  } catch {
    throw new Error(`Cannot remove temporary AWG capability interface ${name}`);
  }
}

async function probeVersion(version: AwgVersion, run: AwgCommand) {
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
    const parameters = interfaceAwgParameters(
      generateAwgProfile(version).parameters
    );
    // Test the enabled state: an older module could silently ignore a false flag.
    if (version === '3.1') parameters.DisableCookies = true;
    const lines = buildAwgLines(parameters);
    await writeFile(file, `[Interface]\n${lines.join('\n')}\n`, {
      mode: 0o600,
    });
    try {
      await run('awg', ['setconf', name, file]);
      const readback = await run('awg', ['showconf', name]);
      const values = new Map(
        readback.split('\n').map((line) => {
          const position = line.indexOf('=');
          return [
            line.slice(0, position).trim(),
            line.slice(position + 1).trim(),
          ];
        })
      );
      return lines.every((line) => {
        const [key, value] = line.split(' = ');
        return values.get(key!) === value;
      });
    } catch {
      // Tool errors may contain the probe's key; never include them in logs/errors.
      return false;
    }
  } finally {
    try {
      if (created) await removeProbe(name, run);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}

export async function detectAwgVersion(
  requested: AwgVersionRequest,
  run: AwgCommand = runCommand
): Promise<AwgVersion> {
  const versions = requested === 'latest' ? AWG_VERSIONS : [requested];
  for (const version of versions) {
    if (await probeVersion(version, run)) return version;
  }
  throw new Error(
    `AWG ${requested} is not supported by both the installed awg tools and kernel module. Upgrade the host module/tools or select a supported version.`
  );
}
