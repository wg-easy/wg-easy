import { describe, expect, test } from 'vitest';

import {
  QuotaDefinitionSchema,
  calculateCounterDelta,
  getNextResetAt,
  isQuotaExceeded,
} from '#server/utils/quota';

describe('quota limits', () => {
  test.each([
    [{ mode: 'RX' as const, rxBytes: 100 }, 100, 0],
    [{ mode: 'TX' as const, txBytes: 100 }, 0, 100],
    [{ mode: 'TOTAL' as const, totalBytes: 100 }, 40, 60],
    [{ mode: 'SEPARATE' as const, rxBytes: 100, txBytes: 200 }, 50, 200],
  ])('marks %o as exceeded at its limit', (limit, rxBytes, txBytes) => {
    expect(isQuotaExceeded(limit, { rxBytes, txBytes })).toBe(true);
  });

  test('keeps separate limits active until either direction reaches its cap', () => {
    expect(
      isQuotaExceeded(
        { mode: 'SEPARATE', rxBytes: 100, txBytes: 200 },
        { rxBytes: 99, txBytes: 199 }
      )
    ).toBe(false);
  });

  test('calculates a new counter epoch without producing a negative delta', () => {
    expect(calculateCounterDelta(120, 150)).toBe(30);
    expect(calculateCounterDelta(120, 15)).toBe(15);
  });

  test('validates mode-specific limits and IANA timezones', () => {
    expect(
      QuotaDefinitionSchema.safeParse({
        name: 'Shared devices',
        enabled: true,
        limit: { mode: 'TOTAL', totalBytes: 1_000_000 },
        reset: {
          frequency: 'DAILY',
          time: '00:00',
          timezone: 'Asia/Taipei',
        },
        clientIds: [1, 2],
      }).success
    ).toBe(true);

    expect(
      QuotaDefinitionSchema.safeParse({
        name: 'Invalid',
        enabled: true,
        limit: { mode: 'TOTAL', rxBytes: 100 },
        reset: {
          frequency: 'DAILY',
          time: '24:00',
          timezone: 'Not/AZone',
        },
        clientIds: [],
      }).success
    ).toBe(false);
  });
});

describe('quota reset scheduling', () => {
  test('finds the next daily reset in the configured timezone', () => {
    expect(
      getNextResetAt(
        { frequency: 'DAILY', time: '00:00', timezone: 'Asia/Taipei' },
        new Date('2026-08-26T15:30:00.000Z')
      )?.toISOString()
    ).toBe('2026-08-26T16:00:00.000Z');
  });

  test('finds the next weekly reset', () => {
    expect(
      getNextResetAt(
        {
          frequency: 'WEEKLY',
          weekday: 1,
          time: '09:00',
          timezone: 'UTC',
        },
        new Date('2026-08-26T00:00:00.000Z')
      )?.toISOString()
    ).toBe('2026-08-31T09:00:00.000Z');
  });

  test('clamps monthly day 31 to the end of a short month', () => {
    expect(
      getNextResetAt(
        {
          frequency: 'MONTHLY',
          day: 31,
          time: '00:00',
          timezone: 'UTC',
        },
        new Date('2027-02-01T00:00:00.000Z')
      )?.toISOString()
    ).toBe('2027-02-28T00:00:00.000Z');
  });

  test('returns null when reset is disabled', () => {
    expect(
      getNextResetAt(
        { frequency: 'NONE' },
        new Date('2026-08-26T00:00:00.000Z')
      )
    ).toBeNull();
  });
});
