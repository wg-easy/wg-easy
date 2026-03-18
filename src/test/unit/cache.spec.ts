import { describe, expect, test, vi } from 'vitest';
import { cacheFunction } from '../../server/utils/cache';

describe('cacheFunction', () => {
  test('retries after a rejected async result instead of caching the failure', async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('ok');

    const cached = cacheFunction(fn, { expiry: 60_000 });

    await expect(cached()).rejects.toThrow('boom');
    await expect(cached()).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('reuses successful async results until expiry', async () => {
    const fn = vi.fn<() => Promise<string>>().mockResolvedValue('ok');
    const cached = cacheFunction(fn, { expiry: 60_000 });

    await expect(cached()).resolves.toBe('ok');
    await expect(cached()).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
