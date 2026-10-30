import { parseCidr } from 'cidr-tools';
import { stringifyIp } from 'ip-bigint';
import { describe, expect, test } from 'vitest';

import {
  isClientAddress,
  nextIPFromUsedAddresses,
  normalizeAddress,
} from '#server/utils/ip';

describe('client address pools', () => {
  test.each([
    [
      '10.8.0.128/29',
      [130, 131, 132, 133, 134].map((host) => `10.8.0.${host}`),
    ],
    [
      '10.8.0.131/29',
      [129, 130, 132, 133, 134].map((host) => `10.8.0.${host}`),
    ],
    ['fd00::8/125', ['fd00::a', 'fd00::b', 'fd00::c', 'fd00::d', 'fd00::e']],
    ['FD00::B/125', ['fd00::9', 'fd00::a', 'fd00::c', 'fd00::d', 'fd00::e']],
  ])(
    'validates and allocates exactly the usable hosts in %s',
    (value, expected) => {
      const cidr = parseCidr(value);
      // Include both subnet boundaries and a host outside each end.
      for (let number = cidr.start - 1n; number <= cidr.end + 1n; number++) {
        const address = stringifyIp({ number, version: cidr.version });
        expect(isClientAddress(address, cidr)).toBe(expected.includes(address));
      }

      const occupied = expected[1]!;
      const used = new Set([occupied]);
      for (const address of expected.filter((host) => host !== occupied)) {
        const allocated = nextIPFromUsedAddresses(cidr, used);
        expect(allocated).toBe(address);
        used.add(allocated);
      }
      expect(() => nextIPFromUsedAddresses(cidr, used)).toThrow(
        'Maximum number of clients reached'
      );
    }
  );

  test('treats equivalent IPv6 spellings as the same occupied or gateway address', () => {
    const cidr = parseCidr('::ffff:192.0.2.3/125');
    const used = new Set([normalizeAddress('::ffff:192.0.2.1')]);
    const address = nextIPFromUsedAddresses(cidr, used);
    expect(address).toBe('::ffff:c000:202');
    used.add(address);
    expect(nextIPFromUsedAddresses(cidr, used)).toBe('::ffff:c000:204');
    expect(isClientAddress('::ffff:c000:203', cidr)).toBe(false);
  });

  test.each(['10.8.0.0/31', 'fd00::/128'])(
    'rejects allocation when the subnet has no usable hosts (%s)',
    (value) => {
      expect(() =>
        nextIPFromUsedAddresses(parseCidr(value), new Set())
      ).toThrow('Maximum number of clients reached');
    }
  );
});
