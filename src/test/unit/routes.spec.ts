import { describe, expect, test } from 'vitest';

import { routesTestExports } from '#server/utils/routes';

const {
  normalizeRoute,
  isManageable,
  collectDesiredRoutes,
  parseDeviceRoutes,
  diffRoutes,
} = routesTestExports;

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

  describe('collectDesiredRoutes', () => {
    test('unions enabled clients and splits by family', () => {
      const result = collectDesiredRoutes(
        [
          {
            enabled: true,
            serverAllowedIps: ['192.168.120.0/22', '2001:db8::/64'],
          },
          { enabled: true, serverAllowedIps: ['10.10.0.0/24'] },
        ],
        { enableIpv6: true }
      );
      expect([...result[4]].sort()).toEqual([
        '10.10.0.0/24',
        '192.168.120.0/22',
      ]);
      expect([...result[6]]).toEqual(['2001:db8::/64']);
    });
    test('ignores disabled clients', () => {
      const result = collectDesiredRoutes(
        [{ enabled: false, serverAllowedIps: ['192.168.120.0/22'] }],
        { enableIpv6: true }
      );
      expect(result[4].size).toBe(0);
    });
    test('dedupes and normalizes host bits across clients', () => {
      const result = collectDesiredRoutes(
        [
          { enabled: true, serverAllowedIps: ['192.168.120.5/22'] },
          { enabled: true, serverAllowedIps: ['192.168.120.99/22'] },
        ],
        { enableIpv6: true }
      );
      expect([...result[4]]).toEqual(['192.168.120.0/22']);
    });
    test('drops default routes', () => {
      const result = collectDesiredRoutes(
        [{ enabled: true, serverAllowedIps: ['0.0.0.0/0', '::/0'] }],
        { enableIpv6: true }
      );
      expect(result[4].size).toBe(0);
      expect(result[6].size).toBe(0);
    });
    test('drops IPv6 when disabled', () => {
      const result = collectDesiredRoutes(
        [{ enabled: true, serverAllowedIps: ['2001:db8::/64'] }],
        { enableIpv6: false }
      );
      expect(result[6].size).toBe(0);
    });
    test('skips unparseable entries', () => {
      const result = collectDesiredRoutes(
        [{ enabled: true, serverAllowedIps: ['garbage', '10.0.0.0/24'] }],
        { enableIpv6: true }
      );
      expect([...result[4]]).toEqual(['10.0.0.0/24']);
    });
  });

  describe('parseDeviceRoutes', () => {
    test('flags the kernel connected route as unmanaged', () => {
      const output = [
        '100.255.1.0/24 proto kernel scope link src 100.255.1.1',
        '192.168.120.0/22 scope link',
      ].join('\n');
      expect(parseDeviceRoutes(output)).toEqual([
        { cidr: '100.255.1.0/24', managed: false },
        { cidr: '192.168.120.0/22', managed: true },
      ]);
    });
    test('skips default routes', () => {
      expect(parseDeviceRoutes('default via 10.0.0.1')).toEqual([]);
    });
    test('handles empty output', () => {
      expect(parseDeviceRoutes('')).toEqual([]);
      expect(parseDeviceRoutes('\n  \n')).toEqual([]);
    });
    test('flags IPv6 link-local kernel route as unmanaged', () => {
      const output = [
        'fe80::/64 proto kernel metric 256 pref medium',
        '2001:db8::/64 metric 1024 pref medium',
      ].join('\n');
      expect(parseDeviceRoutes(output)).toEqual([
        { cidr: 'fe80::/64', managed: false },
        { cidr: '2001:db8::/64', managed: true },
      ]);
    });
  });

  describe('diffRoutes', () => {
    test('adds desired routes that are not present', () => {
      const current = [{ cidr: '100.255.1.0/24', managed: false }];
      const { toAdd, toDel } = diffRoutes(
        new Set(['192.168.120.0/22']),
        current
      );
      expect(toAdd).toEqual(['192.168.120.0/22']);
      expect(toDel).toEqual([]);
    });
    test('removes stale managed routes', () => {
      const current = [
        { cidr: '192.168.120.0/22', managed: true },
        { cidr: '10.10.0.0/24', managed: true },
      ];
      const { toAdd, toDel } = diffRoutes(
        new Set(['192.168.120.0/22']),
        current
      );
      expect(toAdd).toEqual([]);
      expect(toDel).toEqual(['10.10.0.0/24']);
    });
    test('never removes unmanaged routes', () => {
      const current = [{ cidr: '100.255.1.0/24', managed: false }];
      const { toDel } = diffRoutes(new Set(), current);
      expect(toDel).toEqual([]);
    });
    test('does not re-add a route already present as a kernel route', () => {
      const current = [{ cidr: '100.255.1.0/24', managed: false }];
      const { toAdd } = diffRoutes(new Set(['100.255.1.0/24']), current);
      expect(toAdd).toEqual([]);
    });
  });
});
