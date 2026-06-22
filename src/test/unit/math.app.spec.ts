import { describe, expect, test } from 'vitest';

import {
  GIBIBYTE_IN_BYTES,
  quotaBytesToGiB,
  quotaGiBToBytes,
} from '#app/utils/math';

describe('quota conversions', () => {
  test('keeps disabled quotas null', () => {
    expect(quotaBytesToGiB(null)).toBeNull();
    expect(quotaGiBToBytes(null)).toBeNull();
    expect(quotaGiBToBytes(0)).toBeNull();
  });

  test('converts whole and fractional GiB to bytes', () => {
    expect(quotaGiBToBytes(1)).toBe(GIBIBYTE_IN_BYTES);
    expect(quotaGiBToBytes(0.5)).toBe(GIBIBYTE_IN_BYTES / 2);
    expect(quotaGiBToBytes(1 / GIBIBYTE_IN_BYTES)).toBe(1);
  });

  test('rounds edited GiB values to the nearest byte', () => {
    expect(quotaGiBToBytes(1.5 / GIBIBYTE_IN_BYTES)).toBe(2);
  });

  test.each([1, 150, GIBIBYTE_IN_BYTES, Number.MAX_SAFE_INTEGER])(
    'round-trips the exact byte value %s',
    (bytes) => {
      expect(quotaGiBToBytes(quotaBytesToGiB(bytes))).toBe(bytes);
    }
  );
});
