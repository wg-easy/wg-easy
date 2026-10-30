import { afterEach, expect, test, vi } from 'vitest';
import { ref } from 'vue';

import { useHydrationTime } from '../../app/composables/useHydrationTime';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('uses the server timestamp until mounted, then follows the live clock', () => {
  const serverTime = new Date('2026-10-26T10:00:00Z').getTime();
  const mounted = ref(false);
  const savedTime = ref<number>();
  vi.stubGlobal('useState', (_key: string, init: () => number) => {
    savedTime.value ??= init();
    return savedTime;
  });
  vi.stubGlobal('useMounted', () => mounted);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(serverTime);
  expect(useHydrationTime()()).toBe(serverTime);

  clock.mockReturnValue(serverTime + 300_000);
  const now = useHydrationTime();

  expect(now()).toBe(serverTime);
  mounted.value = true;
  expect(now()).toBe(serverTime + 300_000);
  clock.mockReturnValue(serverTime + 301_000);
  expect(now()).toBe(serverTime + 301_000);
});
