import { describe, expect, test } from 'vitest';

import { cacheFunction } from '#server/utils/cache';

describe('cacheFunction', () => {
  test('reuses a fulfilled promise until it expires', async () => {
    let calls = 0;
    const cached = cacheFunction(
      async () => {
        calls += 1;
        return 'ok';
      },
      { expiry: 60_000 }
    );

    await expect(cached()).resolves.toBe('ok');
    await expect(cached()).resolves.toBe('ok');
    expect(calls).toBe(1);
  });

  test('does not keep a rejected promise', async () => {
    let calls = 0;
    const cached = cacheFunction(
      async () => {
        calls += 1;
        throw new Error('down');
      },
      { expiry: 60_000 }
    );

    await expect(cached()).rejects.toThrow('down');
    await expect(cached()).rejects.toThrow('down');
    expect(calls).toBe(2);
  });
});
