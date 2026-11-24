import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, open, rename, rm } from 'node:fs/promises';

import { z } from 'zod';

import { parseInterfaceName } from '#server/utils/interfaceName';

const directory = '/etc/wireguard/.wg-easy';
// The volume holds one VPN configuration, even when WG_INTERFACE is renamed.
const failureFile = 'failed-post-up';
const id = z.int().positive().max(0xffffffff);
const rule = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('suppress'), priority: id }),
  z.object({ kind: z.literal('lookup'), priority: id, table: id, mark: id }),
  z.object({ kind: z.literal('listener'), port: id.max(65535), mark: id }),
  z.object({
    kind: z.literal('protect'),
    address: z.union([z.ipv4(), z.ipv6()]),
  }),
]);
// Earlier records included routes. Linux removes those with the link.
const ownedRules = z
  .array(z.union([rule, z.object({ kind: z.literal('route'), table: id })]))
  .transform((items) => items.filter((item) => item.kind !== 'route'));
export type PolicyRule = z.infer<typeof rule>;

const tunnelRecord = z.object({
  version: z.literal(1),
  name: z.string(),
  index: z.int().positive(),
  backend: z.enum(['wg', 'awg']),
  table: z.string(),
  disableIpv6: z.boolean(),
  filtering: z.boolean(),
  // Down hooks are armed only after PostUp succeeds.
  preDown: z.string(),
  postDown: z.string(),
  // The policy tag also identifies this generation in the kernel link alias.
  policy: z.object({
    tag: z.string().regex(/^wg-easy-[\da-f-]{36}$/),
    owned: z.object({ ipv4: ownedRules, ipv6: ownedRules }),
  }),
});
export type TunnelRecord = z.infer<typeof tunnelRecord>;

function privateToService(stat: { uid: number; mode: number }) {
  return (
    (stat.uid === process.geteuid!() || stat.uid === 0) &&
    (stat.mode & 0o077) === 0
  );
}

// Pin the private directory while opening and renaming entries. A replaced
// directory or symlink in the configuration volume cannot redirect writes.
async function withDirectory<T>(operation: (path: string) => Promise<T>) {
  const dir = await open(
    directory,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
  );
  try {
    if (!privateToService(await dir.stat())) {
      throw new Error('Unsafe tunnel recovery directory');
    }
    return await operation('/proc/self/fd/' + dir.fd);
  } finally {
    await dir.close();
  }
}

function readRecoveryFile(filename: string) {
  return withDirectory(async (path) => {
    const file = await open(
      path + '/' + filename,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
    );
    try {
      const stat = await file.stat();
      if (!stat.isFile() || !privateToService(stat)) {
        throw new Error('Unsafe tunnel recovery file');
      }
      return await file.readFile('utf8');
    } finally {
      await file.close();
    }
  });
}

async function saveRecoveryFile(filename: string, contents: string) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await withDirectory(async (path) => {
    const temp = path + '/' + randomUUID() + '.tmp';
    const file = await open(temp, 'wx', 0o600);
    try {
      try {
        await file.writeFile(contents);
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temp, path + '/' + filename);
    } finally {
      await rm(temp, { force: true });
    }
  });
}

export async function readTunnelRecord(name: string) {
  return tunnelRecord.parse(JSON.parse(await readRecoveryFile(name + '.json')));
}

export function saveTunnelRecord(record: TunnelRecord) {
  return saveRecoveryFile(record.name + '.json', JSON.stringify(record));
}

export function removeTunnelRecord(name: string) {
  return withDirectory((path) =>
    rm(path + '/' + name + '.json', { force: true })
  );
}

export async function readPostUpFailure() {
  try {
    const name = await readRecoveryFile(failureFile);
    if (!name) {
      throw new Error('Missing interface name in PostUp failure record');
    }
    return parseInterfaceName(name);
  } catch (error) {
    // A new volume has neither the private directory nor a failure marker.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export function recordPostUpFailure(name: string) {
  return saveRecoveryFile(failureFile, parseInterfaceName(name));
}

export async function clearPostUpFailure() {
  try {
    await withDirectory((path) =>
      rm(path + '/' + failureFile, { force: true })
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
