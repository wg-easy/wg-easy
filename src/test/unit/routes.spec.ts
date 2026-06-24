import { describe, expect, test } from 'vitest';

import { routesTestExports } from '#server/utils/routes';

const { normalizeRoute, isManageable } = routesTestExports;

describe('routes', () => {
  describe('normalizeRoute', () => {
    test('canonicalizes IPv4 host bits to the network address', () => {
      expect(normalizeRoute('192.168.120.5/22')).toEqual({
        cidr: '192.168.120.0/22',
        version: 4,
      });
    });
    test('adds /32 to a bare IPv4 address', () => {
      expect(normalizeRoute('10.0.0.5')).toEqual({
        cidr: '10.0.0.5/32',
        version: 4,
      });
    });
    test('canonicalizes IPv6 host bits to the network address', () => {
      expect(normalizeRoute('2001:db8::5/64')).toEqual({
        cidr: '2001:db8::/64',
        version: 6,
      });
    });
    test('adds /128 to a bare IPv6 address', () => {
      expect(normalizeRoute('2001:db8::1')).toEqual({
        cidr: '2001:db8::1/128',
        version: 6,
      });
    });
    test('returns null for unparseable input', () => {
      expect(normalizeRoute('garbage')).toBeNull();
      expect(normalizeRoute('')).toBeNull();
    });
  });

  describe('isManageable', () => {
    test('rejects default routes', () => {
      expect(isManageable('0.0.0.0/0', 4)).toBe(false);
      expect(isManageable('::/0', 6)).toBe(false);
    });
    test('rejects IPv6 link-local and multicast', () => {
      expect(isManageable('fe80::/64', 6)).toBe(false);
      expect(isManageable('ff00::/8', 6)).toBe(false);
    });
    test('accepts ordinary subnets', () => {
      expect(isManageable('192.168.120.0/22', 4)).toBe(true);
      expect(isManageable('2001:db8::/64', 6)).toBe(true);
    });
  });
});
