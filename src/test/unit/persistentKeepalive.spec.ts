import { describe, expect, test } from 'vitest';

import { assertPersistentKeepalive } from '#server/utils/persistentKeepalive';
import { PersistentKeepaliveSchema } from '#server/utils/types';

describe('PersistentKeepalive validation', () => {
  test.each([
    [0, 0],
    [25, 25],
    [65535, 65535],
    ['25', 25],
    ['00025', 25],
    ['20-30', '20-30'],
    ['0-30', '0-30'],
    ['65534-65535', '65534-65535'],
    ['25-25', 25],
    ['0-0', 0],
    ['020-030', '20-30'],
  ])('normalizes %s to %s', (value, expected) => {
    expect(PersistentKeepaliveSchema.parse(value)).toBe(expected);
  });
  test.each([
    -1,
    65536,
    1.5,
    NaN,
    Infinity,
    '',
    'off',
    '20-65536',
    '65536',
    '30-20',
    '20-',
    '-30',
    '1.5-30',
    '20-30\nPublicKey = bad',
    null,
  ])('rejects %s', (value) => {
    expect(PersistentKeepaliveSchema.safeParse(value).success).toBe(false);
  });
  test('accepts ranges with the latest AWG backend', () => {
    expect(() => assertPersistentKeepalive('20-30', 'awg')).not.toThrow();
  });
  test('WireGuard rejects ranges but accepts numeric intervals', () => {
    expect(() => assertPersistentKeepalive('20-30', 'wg')).toThrow(
      'require AmneziaWG'
    );
    expect(() => assertPersistentKeepalive(25, 'wg')).not.toThrow();
    expect(() => assertPersistentKeepalive(0, 'wg')).not.toThrow();
  });
});
