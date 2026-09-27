import { describe, expect, test } from 'vitest';

import { parseInterfaceName } from '#server/utils/interfaceName';

describe('parseInterfaceName', () => {
  test('returns the default interface when a custom name is not specified', () => {
    expect(parseInterfaceName(undefined)).toBe('wg0');
    expect(parseInterfaceName('')).toBe('wg0');
  });

  test('accepts names compliant with wg-quick', () => {
    expect(parseInterfaceName('wg1')).toBe('wg1');
    expect(parseInterfaceName('wg-home')).toBe('wg-home');
    expect(parseInterfaceName('a'.repeat(15))).toBe('a'.repeat(15));
  });

  test('rejects invalid names', () => {
    expect(() => parseInterfaceName('wg 0')).toThrow(
      'Invalid interface name: wg 0'
    );
    expect(() => parseInterfaceName('wg0; id')).toThrow();
    expect(() => parseInterfaceName('wg/0')).toThrow();
    expect(() => parseInterfaceName('a'.repeat(16))).toThrow();
  });
});
