import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { cacheFunction } from '#server/utils/cache';

beforeEach(() => vi.spyOn(performance, 'now').mockReturnValue(0));
afterEach(() => vi.restoreAllMocks());

test('keeps slow loads shared and gives their result a full lifetime', async () => {
  const { promise, resolve } = Promise.withResolvers<string>();
  const operation = vi
    .fn()
    .mockReturnValueOnce(promise)
    .mockResolvedValue('refreshed');
  const cached = cacheFunction(operation, { expiry: 1000 });

  const first = cached();
  vi.mocked(performance.now).mockReturnValue(5000);
  const second = cached();
  resolve('loaded');
  expect(await Promise.all([first, second])).toEqual(['loaded', 'loaded']);
  expect(operation).toHaveBeenCalledOnce();

  vi.mocked(performance.now).mockReturnValue(5999);
  await expect(cached()).resolves.toBe('loaded');
  expect(operation).toHaveBeenCalledOnce();

  vi.mocked(performance.now).mockReturnValue(6000);
  expect(await Promise.all([cached(), cached()])).toEqual([
    'refreshed',
    'refreshed',
  ]);
  expect(operation).toHaveBeenCalledTimes(2);
});

test('wall clock adjustments do not affect expiration', async () => {
  const wallClock = vi.spyOn(Date, 'now').mockReturnValue(10_000);
  const operation = vi
    .fn()
    .mockResolvedValueOnce('first')
    .mockResolvedValue('next');
  const cached = cacheFunction(operation, { expiry: 1000 });

  await expect(cached()).resolves.toBe('first');
  wallClock.mockReturnValue(1_000_000);
  await expect(cached()).resolves.toBe('first');
  wallClock.mockReturnValue(0);
  vi.mocked(performance.now).mockReturnValue(1000);
  await expect(cached()).resolves.toBe('next');
  expect(operation).toHaveBeenCalledTimes(2);
});

test.each(['throw', 'reject'])(
  'propagates a loader %s to all callers and allows a retry',
  async (failure) => {
    const error = new Error('Unavailable');
    const operation = vi
      .fn()
      .mockImplementationOnce(() => {
        if (failure === 'throw') throw error;
        return Promise.reject(error);
      })
      .mockResolvedValue('recovered');
    const cached = cacheFunction(operation, { expiry: 1000 });

    expect(await Promise.allSettled([cached(), cached()])).toEqual([
      { status: 'rejected', reason: error },
      { status: 'rejected', reason: error },
    ]);
    expect(operation).toHaveBeenCalledOnce();
    await expect(cached()).resolves.toBe('recovered');
    expect(operation).toHaveBeenCalledTimes(2);
  }
);

test('caches undefined as a successful result', async () => {
  const operation = vi.fn().mockResolvedValue(undefined);
  const cached = cacheFunction(operation, { expiry: 1000 });

  await expect(cached()).resolves.toBeUndefined();
  await expect(cached()).resolves.toBeUndefined();
  expect(operation).toHaveBeenCalledOnce();
});

test('zero expiry shares pending work but does not retain its result', async () => {
  const { promise, resolve } = Promise.withResolvers<string>();
  const operation = vi
    .fn()
    .mockReturnValueOnce(promise)
    .mockResolvedValue('next');
  const cached = cacheFunction(operation, { expiry: 0 });

  const first = cached();
  const second = cached();
  resolve('first');
  expect(await Promise.all([first, second])).toEqual(['first', 'first']);
  expect(operation).toHaveBeenCalledOnce();
  await expect(cached()).resolves.toBe('next');
  expect(operation).toHaveBeenCalledTimes(2);
});

test.each([-1, NaN, Infinity])('rejects invalid expiry: %s', (expiry) => {
  const operation = vi.fn();
  expect(() => cacheFunction(operation, { expiry })).toThrow(RangeError);
  expect(operation).not.toHaveBeenCalled();
});
