import { describe, expect, test, vi } from 'vitest';

import { AsyncMutex } from '#server/utils/AsyncMutex';

describe('AsyncMutex', () => {
  test('runs operations exclusively in submission order', async () => {
    const mutex = new AsyncMutex();
    let releaseFirst!: () => void;
    const firstStarted = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const second = vi.fn(async () => 'second');

    const firstResult = mutex.runExclusive(async () => {
      await firstStarted;
      return 'first';
    });
    const secondResult = mutex.runExclusive(second);

    expect(second).not.toHaveBeenCalled();
    releaseFirst();
    await expect(firstResult).resolves.toBe('first');
    await expect(secondResult).resolves.toBe('second');
    expect(second).toHaveBeenCalledOnce();
  });

  test('continues with the next operation after a failure', async () => {
    const mutex = new AsyncMutex();

    const failedResult = mutex.runExclusive(async () => {
      throw new Error('failed');
    });
    const nextResult = mutex.runExclusive(async () => 'next');

    await expect(failedResult).rejects.toThrow('failed');
    await expect(nextResult).resolves.toBe('next');
  });
});
