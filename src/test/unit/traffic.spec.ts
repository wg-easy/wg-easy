import { describe, expect, test } from 'vitest';

import {
  calculateTrafficDelta,
  getExceededTrafficQuotas,
  getTrafficPeriodRange,
  parseUtcDate,
  sumTrafficDays,
} from '#server/utils/traffic';

describe('traffic accounting', () => {
  test('calculates increasing and reset counter deltas', () => {
    expect(calculateTrafficDelta(100, 150)).toBe(50);
    expect(calculateTrafficDelta(100, 100)).toBe(0);
    expect(calculateTrafficDelta(100, 25)).toBe(25);
  });

  test('validates UTC date keys', () => {
    expect(parseUtcDate('2024-02-29')).not.toBeNull();
    expect(parseUtcDate('2023-02-29')).toBeNull();
    expect(parseUtcDate('2024-2-9')).toBeNull();
  });

  test('uses UTC calendar day boundaries', () => {
    expect(
      getTrafficPeriodRange('daily', new Date('2026-06-22T23:59:59Z'))
    ).toEqual({ start: '2026-06-22', endExclusive: '2026-06-23' });
  });

  test('uses Monday-based weeks across month boundaries', () => {
    expect(
      getTrafficPeriodRange('weekly', new Date('2026-06-01T12:00:00Z'))
    ).toEqual({ start: '2026-06-01', endExclusive: '2026-06-08' });
    expect(
      getTrafficPeriodRange('weekly', new Date('2026-05-31T12:00:00Z'))
    ).toEqual({ start: '2026-05-25', endExclusive: '2026-06-01' });
  });

  test('uses calendar months including leap years', () => {
    expect(
      getTrafficPeriodRange('monthly', new Date('2024-02-29T12:00:00Z'))
    ).toEqual({ start: '2024-02-01', endExclusive: '2024-03-01' });
  });

  test('sums only sparse days in the selected range', () => {
    expect(
      sumTrafficDays(
        [
          { date: '2026-05-31', receivedBytes: 100, sentBytes: 100 },
          { date: '2026-06-01', receivedBytes: 10, sentBytes: 20 },
          { date: '2026-06-03', receivedBytes: 30, sentBytes: 40 },
        ],
        { start: '2026-06-01', endExclusive: '2026-06-04' }
      )
    ).toEqual({ receivedBytes: 40, sentBytes: 60 });
  });

  test('enforces simultaneous quotas at the exact combined limit', () => {
    const date = new Date('2026-06-03T12:00:00Z');
    const days = [
      { date: '2026-06-01', receivedBytes: 30, sentBytes: 20 },
      { date: '2026-06-03', receivedBytes: 40, sentBytes: 10 },
    ];

    expect(
      getExceededTrafficQuotas(
        { dailyQuota: 50, weeklyQuota: 100, monthlyQuota: 101 },
        days,
        date
      )
    ).toEqual(['daily', 'weekly']);
  });

  test('does not enforce disabled quotas', () => {
    expect(
      getExceededTrafficQuotas(
        { dailyQuota: null, weeklyQuota: null, monthlyQuota: null },
        [{ date: '2026-06-03', receivedBytes: 100, sentBytes: 100 }],
        new Date('2026-06-03T12:00:00Z')
      )
    ).toEqual([]);
  });
});
