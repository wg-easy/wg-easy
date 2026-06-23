import { describe, expect, test } from 'vitest';

import {
  GIBIBYTE_IN_BYTES,
  quotaBytesToGiB,
  quotaBytesToGiBInput,
  quotaGiBInputToBytes,
  quotaGiBToBytes,
} from '#app/utils/math';

describe('quota conversions', () => {
  test('keeps disabled quotas null', () => {
    expect(quotaBytesToGiB(null)).toBeNull();
    expect(quotaBytesToGiBInput(null)).toBe('');
    expect(quotaGiBInputToBytes('')).toBeNull();
    expect(quotaGiBInputToBytes('0')).toBeNull();
    expect(quotaGiBToBytes(null)).toBeNull();
    expect(quotaGiBToBytes(0)).toBeNull();
    expect(quotaGiBToBytes(0.1 / GIBIBYTE_IN_BYTES)).toBeNull();
  });

  test('converts whole and fractional GiB to bytes', () => {
    expect(quotaGiBToBytes(1)).toBe(GIBIBYTE_IN_BYTES);
    expect(quotaGiBToBytes(0.5)).toBe(GIBIBYTE_IN_BYTES / 2);
    expect(quotaGiBToBytes(1 / GIBIBYTE_IN_BYTES)).toBe(1);
    expect(quotaGiBInputToBytes('1')).toBe(GIBIBYTE_IN_BYTES);
    expect(quotaGiBInputToBytes('0.5')).toBe(GIBIBYTE_IN_BYTES / 2);
  });

  test('rounds edited GiB values to the nearest byte', () => {
    expect(quotaGiBToBytes(1.5 / GIBIBYTE_IN_BYTES)).toBe(2);
  });

  test.each([1, 150, GIBIBYTE_IN_BYTES, Number.MAX_SAFE_INTEGER])(
    'round-trips the exact byte value %s',
    (bytes) => {
      expect(quotaGiBToBytes(quotaBytesToGiB(bytes))).toBe(bytes);
      expect(quotaGiBInputToBytes(quotaBytesToGiBInput(bytes))).toBe(bytes);
    }
  );

  test('formats quota input values without noisy floating point decimals', () => {
    expect(quotaBytesToGiBInput(GIBIBYTE_IN_BYTES)).toBe('1');
    expect(quotaBytesToGiBInput(GIBIBYTE_IN_BYTES / 2)).toBe('0.5');
    expect(quotaBytesToGiBInput(107374182)).toBe('0.1');
  });

  test('ignores invalid quota input values', () => {
    expect(quotaGiBInputToBytes('-1')).toBeUndefined();
    expect(quotaGiBInputToBytes('invalid')).toBeUndefined();
    expect(quotaGiBInputToBytes('9007199254740992')).toBeUndefined();
  });
});
