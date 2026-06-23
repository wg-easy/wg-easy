import { describe, expect, test } from 'vitest';

import {
  formatTrafficDateInput,
  getTrafficQuotaUsagePercent,
} from '#app/utils/traffic';

describe('app traffic helpers', () => {
  test('formats date inputs using the UTC date', () => {
    expect(formatTrafficDateInput(new Date('2026-06-23T23:30:00.000Z'))).toBe(
      '2026-06-23'
    );
  });

  test('returns null quota progress for unlimited reports', () => {
    expect(getTrafficQuotaUsagePercent(100, null)).toBeNull();
  });

  test('calculates quota progress below and at the limit', () => {
    expect(getTrafficQuotaUsagePercent(25, 100)).toBe(25);
    expect(getTrafficQuotaUsagePercent(100, 100)).toBe(100);
  });

  test('clamps quota progress above the limit', () => {
    expect(getTrafficQuotaUsagePercent(150, 100)).toBe(100);
  });
});
