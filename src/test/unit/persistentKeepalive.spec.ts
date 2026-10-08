import { describe, expect, test } from 'vitest';

import {
  assertPersistentKeepalive,
  supportsKeepaliveRanges,
} from '#server/utils/persistentKeepalive';
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
  test.each(['3.0', '3.1'] as const)('allows ranges for AWG %s', (version) => {
    expect(supportsKeepaliveRanges('awg', version)).toBe(true);
    expect(() =>
      assertPersistentKeepalive('20-30', 'awg', version)
    ).not.toThrow();
  });
  test.each([
    ['wg', '3.1'],
    ['awg', '2.0'],
    ['awg', null],
    ['awg', undefined],
  ] as const)(
    'rejects ranges for %s/%s but preserves numeric intervals',
    (backend, version) => {
      expect(supportsKeepaliveRanges(backend, version)).toBe(false);
      expect(() =>
        assertPersistentKeepalive('20-30', backend, version)
      ).toThrow('require a saved AWG');
      expect(() =>
        assertPersistentKeepalive(25, backend, version)
      ).not.toThrow();
      expect(() =>
        assertPersistentKeepalive(0, backend, version)
      ).not.toThrow();
    }
  );
});
