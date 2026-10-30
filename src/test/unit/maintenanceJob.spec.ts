import { expect, onTestFinished, test, vi } from 'vitest';

import { startMaintenance } from '#server/jobs/maintenance';

test('a failed run does not prevent the next scheduled run or clean shutdown', async () => {
  vi.useFakeTimers();
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  onTestFinished(() => {
    log.mockRestore();
    vi.useRealTimers();
  });
  const failure = new Error('Host temporarily unavailable');
  const operation = vi
    .fn<() => Promise<void>>()
    .mockRejectedValueOnce(failure)
    .mockResolvedValue(undefined);
  const stop = startMaintenance(operation, 1000);
  onTestFinished(stop);

  await vi.advanceTimersByTimeAsync(0);
  expect(operation).toHaveBeenCalledOnce();
  expect(log).toHaveBeenCalledWith('Running VPN maintenance failed:', failure);

  await vi.advanceTimersByTimeAsync(1000);
  expect(operation).toHaveBeenCalledTimes(2);
  await stop();
  await vi.advanceTimersByTimeAsync(3000);
  expect(operation).toHaveBeenCalledTimes(2);
});

test('does not overlap maintenance and waits for an active run during shutdown', async () => {
  vi.useFakeTimers();
  onTestFinished(() => {
    vi.useRealTimers();
  });
  const gate = Promise.withResolvers<undefined>();
  const operation = vi.fn(() => gate.promise);
  const stop = startMaintenance(operation, 1000);
  await vi.advanceTimersByTimeAsync(3000);
  expect(operation).toHaveBeenCalledOnce();
  let stopped = false;
  const stopping = stop().then(() => {
    stopped = true;
  });
  await Promise.resolve();
  expect(stopped).toBe(false);
  gate.resolve(undefined);
  await stopping;
  await vi.advanceTimersByTimeAsync(3000);
  expect(stopped).toBe(true);
  expect(operation).toHaveBeenCalledOnce();
});
