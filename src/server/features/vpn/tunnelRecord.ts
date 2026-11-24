import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, open, rename, rm } from 'node:fs/promises';

import { z } from 'zod';

import { defaultPolicyState } from './defaultPolicy';

const directory = '/etc/wireguard/.wg-easy';
const tunnelRecord = z.object({
  version: z.literal(1),
  name: z.string(),
  index: z.int().positive(),
  backend: z.enum(['wg', 'awg']),
  table: z.string(),
  disableIpv6: z.boolean(),
  // Down hooks are armed only after PostUp succeeds.
  preDown: z.string(),
  postDown: z.string(),
  // The policy tag also identifies this generation in the kernel link alias.
  policy: defaultPolicyState,
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

export function readTunnelRecord(name: string) {
  return withDirectory(async (path) => {
    const file = await open(
      path + '/' + name + '.json',
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
    );
    try {
      const stat = await file.stat();
      if (!stat.isFile() || !privateToService(stat)) {
        throw new Error('Unsafe tunnel recovery file');
      }
      return tunnelRecord.parse(JSON.parse(await file.readFile('utf8')));
    } finally {
      await file.close();
    }
  });
}

export async function saveTunnelRecord(record: TunnelRecord) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await withDirectory(async (path) => {
    const temp = path + '/' + randomUUID() + '.tmp';
    const file = await open(temp, 'wx', 0o600);
    try {
      try {
        await file.writeFile(JSON.stringify(record));
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temp, path + '/' + record.name + '.json');
    } finally {
      await rm(temp, { force: true });
    }
  });
}

export function removeTunnelRecord(name: string) {
  return withDirectory((path) =>
    rm(path + '/' + name + '.json', { force: true })
  );
}
