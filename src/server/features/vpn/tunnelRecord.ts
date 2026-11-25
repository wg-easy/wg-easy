import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, open, rename, rm, type FileHandle } from 'node:fs/promises';

import { z } from 'zod';

import { parseInterfaceName } from '#server/utils/interfaceName';

const directory = '/etc/wireguard/.wg-easy';
// The volume holds one VPN configuration, even when WG_INTERFACE is renamed.
const failureFile = 'failed-post-up';
const generation = z.string().regex(/^wg-easy-[\da-f-]{36}$/);
const postUpMarker = z.object({
  name: z.string().min(1),
  generation,
  failedDownHook: z
    .enum(['PreDown', 'PostDown', 'PreDown and PostDown'])
    .optional(),
});
export type DownHookFailure = NonNullable<
  z.infer<typeof postUpMarker>['failedDownHook']
>;
const id = z.int().positive().max(0xffffffff);
const rule = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('suppress'), priority: id }),
  z.object({ kind: z.literal('lookup'), priority: id, table: id, mark: id }),
  z.object({ kind: z.literal('listener'), port: id.max(65535), mark: id }),
  z.object({ kind: z.literal('save-mark'), mark: id }),
  z.object({ kind: z.literal('restore-mark') }),
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
  index: z.int().positive().nullable(),
  phase: z.enum(['creating', 'deleting']).optional(),
  namespace: z.string().optional(),
  backend: z.enum(['wg', 'awg']),
  table: z.string(),
  disableIpv6: z.boolean(),
  filtering: z.boolean(),
  // Down hooks are armed only after PostUp succeeds.
  postUpSucceeded: z.literal(true).optional(),
  preDown: z.string(),
  postDown: z.string(),
  // The policy tag identifies this generation by its Linux alternate name.
  policy: z.object({
    tag: generation,
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

function withRecoveryFile<T>(
  filename: string,
  flags: number,
  operation: (file: FileHandle) => Promise<T>
) {
  return withDirectory(async (path) => {
    const file = await open(
      path + '/' + filename,
      flags | constants.O_NOFOLLOW | constants.O_NONBLOCK
    );
    try {
      const stat = await file.stat();
      if (!stat.isFile() || !privateToService(stat) || stat.nlink !== 1) {
        throw new Error('Unsafe tunnel recovery file');
      }
      return await operation(file);
    } finally {
      await file.close();
    }
  });
}

function readRecoveryFile(filename: string) {
  return withRecoveryFile(filename, constants.O_RDONLY, (file) =>
    file.readFile('utf8')
  );
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
  try {
    const record = tunnelRecord.parse(
      JSON.parse(await readRecoveryFile(name + '.json'))
    );
    if (record.name !== name) {
      throw new Error('Tunnel recovery record name mismatch');
    }
    return record;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export function saveTunnelRecord(record: TunnelRecord) {
  return saveRecoveryFile(record.name + '.json', JSON.stringify(record));
}

export function removeTunnelRecord(name: string) {
  return withDirectory((path) =>
    rm(path + '/' + name + '.json', { force: true })
  );
}

export async function readPostUpMarker() {
  try {
    const contents = await readRecoveryFile(failureFile);
    if (!contents) {
      return;
    }
    // Versions before generation-bound markers stored just the interface name.
    if (!contents.startsWith('{')) {
      return { name: parseInterfaceName(contents), succeeded: false };
    }
    const marker = postUpMarker.parse(JSON.parse(contents));
    const name = parseInterfaceName(marker.name);
    const record = await readTunnelRecord(name);
    if (record && record.policy.tag !== marker.generation) {
      throw new Error(
        `PostUp marker for ${name} belongs to a different tunnel generation`
      );
    }
    return {
      name,
      succeeded: !marker.failedDownHook && record?.postUpSucceeded === true,
      failedDownHook: marker.failedDownHook,
    };
  } catch (error) {
    // A new volume has neither the private directory nor a failure marker.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function writeHookMarker(
  name: string,
  failedDownHook?: DownHookFailure
) {
  const record = await readTunnelRecord(parseInterfaceName(name));
  if (!record) {
    throw new Error(`No tunnel recovery record for ${name}`);
  }
  return saveRecoveryFile(
    failureFile,
    JSON.stringify({ name, generation: record.policy.tag, failedDownHook })
  );
}

export async function clearPostUpFailure() {
  try {
    await withDirectory((path) =>
      rm(path + '/' + failureFile, { force: true })
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    // A directory can prevent unlinking a writable journal. Persist success
    // in the file itself so a later boot can distinguish it from a failed hook.
    await withRecoveryFile(failureFile, constants.O_WRONLY, async (file) => {
      await file.truncate(0);
      await file.sync();
    });
  }
}
