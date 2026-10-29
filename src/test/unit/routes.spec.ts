import { describe, expect, test } from 'vitest';

import {
  desiredServerRoutes,
  diffRoutes,
  routeCommand,
} from '#server/utils/routes';

describe('desiredServerRoutes', () => {
  test('collects routes of enabled clients without duplicates', () => {
    const routes = desiredServerRoutes(
      [
        {
          enabled: true,
          serverAllowedIps: ['192.168.120.0/22', '10.9.0.0/16'],
        },
        { enabled: true, serverAllowedIps: ['192.168.120.0/22'] },
        { enabled: false, serverAllowedIps: ['172.16.0.0/12'] },
      ],
      true
    );

    expect([...routes].sort()).toEqual(['10.9.0.0/16', '192.168.120.0/22']);
  });

  test('skips default routes', () => {
    const routes = desiredServerRoutes(
      [{ enabled: true, serverAllowedIps: ['0.0.0.0/0', '::/0'] }],
      true
    );

    expect(routes.size).toBe(0);
  });

  test('skips IPv6 routes when IPv6 is disabled', () => {
    const routes = desiredServerRoutes(
      [{ enabled: true, serverAllowedIps: ['10.9.0.0/16', 'fd00::/64'] }],
      false
    );

    expect([...routes]).toEqual(['10.9.0.0/16']);
  });

  test('skips entries that are not an IP or CIDR', () => {
    const routes = desiredServerRoutes(
      [
        {
          enabled: true,
          serverAllowedIps: ['10.9.0.0/16; touch /tmp/x', 'example.com', ''],
        },
      ],
      true
    );

    expect(routes.size).toBe(0);
  });
});

describe('diffRoutes', () => {
  test('returns routes to add and remove', () => {
    expect(
      diffRoutes(
        new Set(['10.0.0.0/24', '10.1.0.0/24']),
        new Set(['10.1.0.0/24', '10.2.0.0/24'])
      )
    ).toEqual({ add: ['10.2.0.0/24'], remove: ['10.0.0.0/24'] });
  });

  test('is empty when nothing changed', () => {
    const routes = new Set(['10.0.0.0/24']);

    expect(diffRoutes(routes, new Set(routes))).toEqual({
      add: [],
      remove: [],
    });
  });
});

describe('routeCommand', () => {
  test('builds IPv4 and IPv6 commands', () => {
    expect(routeCommand('replace', '10.0.0.0/24', 'wg0', 'auto')).toBe(
      'ip -4 route replace 10.0.0.0/24 dev wg0'
    );
    expect(routeCommand('del', 'fd00::/64', 'wg0', 'auto')).toBe(
      'ip -6 route del fd00::/64 dev wg0'
    );
  });

  test('uses a custom routing table', () => {
    expect(routeCommand('replace', '10.0.0.0/24', 'wg0', '100')).toBe(
      'ip -4 route replace 10.0.0.0/24 dev wg0 table 100'
    );
  });

  test('does nothing when routing is off', () => {
    expect(routeCommand('replace', '10.0.0.0/24', 'wg0', 'off')).toBeNull();
  });
});
