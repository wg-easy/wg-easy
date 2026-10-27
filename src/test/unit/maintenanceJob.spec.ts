import { expect, onTestFinished, test, vi } from 'vitest';

import { startMaintenance } from '#server/jobs/maintenance';

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
