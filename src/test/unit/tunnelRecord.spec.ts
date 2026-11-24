import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, onTestFinished, test, vi } from 'vitest';

import {
  clearPostUpFailure,
  readPostUpFailure,
} from '#server/features/vpn/tunnelRecord';

let directory: string;
vi.mock('node:fs/promises', async (original) => {
  const fs = await original<typeof import('node:fs/promises')>();
  return {
    ...fs,
    open: (...[path, ...args]: Parameters<typeof fs.open>) =>
      fs.open(path === '/etc/wireguard/.wg-easy' ? directory : path, ...args),
    rm: (...[path, ...args]: Parameters<typeof fs.rm>) => {
      if (String(path).endsWith('/failed-post-up')) {
        throw Object.assign(new Error('Device or resource busy'), {
          code: 'EBUSY',
        });
      }
      return fs.rm(path, ...args);
    },
  };
});

test.runIf(process.platform === 'linux')(
  'persists a successful PostUp when its journal cannot be unlinked',
  async () => {
    directory = await mkdtemp(join(tmpdir(), 'wg-post-up-'));
    onTestFinished(() => rm(directory, { recursive: true, force: true }));
    const marker = join(directory, 'failed-post-up');
    await writeFile(marker, 'wg0', { mode: 0o600 });
    expect(await readPostUpFailure()).toBe('wg0');
    await clearPostUpFailure();
    expect(await readFile(marker, 'utf8')).toBe('');
    expect(await readPostUpFailure()).toBeUndefined();
  }
);
