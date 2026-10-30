import { describe, expect, test } from 'vitest';

import { bytes } from '../../app/utils/math';

describe('bytes', () => {
  test('formats zero and a positive value', () => {
    expect(bytes(0)).toBe('0 B');
    expect(bytes(1500)).toBe('1.5 KB');
    expect(bytes(1024, 2, true)).toBe('1 KiB');
  });

  test('treats a negative or non-finite transfer as zero', () => {
    expect(bytes(-1)).toBe('0 B');
    expect(bytes(Number.POSITIVE_INFINITY)).toBe('0 B');
    expect(bytes(Number.NEGATIVE_INFINITY)).toBe('0 B');
    expect(bytes(Number.NaN)).toBe('0 B');
  });
});
