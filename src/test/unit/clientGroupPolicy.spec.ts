import { describe, expect, test, vi } from 'vitest';

import { resolveClientEffectivePolicy } from '#shared/utils/clientPolicy';
import { firewallTestExports } from '#server/utils/firewall';
import { wg } from '#server/utils/wgHelper';
import type { ClientType } from '#db/repositories/client/types';
import type { InterfaceType } from '#db/repositories/interface/types';
import type { UserConfigType } from '#db/repositories/userConfig/types';

vi.mock('#server/utils/config', () => ({
  WG_ENV: {
    WG_EXECUTABLE: 'wg',
    DISABLE_IPV6: false,
  },
}));

const userConfig = {
  defaultAllowedIps: ['0.0.0.0/0'],
  defaultDns: ['1.1.1.1'],
  host: 'vpn.example.test',
  port: 51820,
} as UserConfigType;

const wgInterface = {
  publicKey: 'server-public-key',
  firewallEnabled: true,
} as InterfaceType;

function createClient(overrides: Partial<ClientType> = {}) {
  return {
    id: 1,
    name: 'Phone',
    ipv4Address: '10.8.0.2',
    ipv6Address: 'fd00::2',
    privateKey: 'client-private-key',
    publicKey: 'client-public-key',
    preSharedKey: 'client-preshared-key',
    allowedIps: null,
    dns: null,
    firewallIps: null,
    serverAllowedIps: ['192.168.50.0/24'],
    preUp: '',
    postUp: '',
    preDown: '',
    postDown: '',
    mtu: 1420,
    jC: null,
    jMin: null,
    jMax: null,
    i1: null,
    i2: null,
    i3: null,
    i4: null,
    i5: null,
    persistentKeepalive: 25,
    serverEndpoint: null,
    enabled: true,
    userId: 1,
    interfaceId: 'wg0',
    expiresAt: null,
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
    ...overrides,
  } as ClientType;
}

describe('client group effective policy', () => {
  test('ungrouped clients preserve client and global fallback behavior', () => {
    const policy = resolveClientEffectivePolicy({
      client: createClient({
        allowedIps: ['10.10.0.0/24'],
        dns: null,
        firewallIps: null,
      }),
      groups: [],
      userConfig,
      firewallEnabled: true,
    });

    expect(policy.allowedIps).toEqual(['10.10.0.0/24']);
    expect(policy.dns).toEqual(['1.1.1.1']);
    expect(policy.firewallIps).toEqual(['10.10.0.0/24']);
    expect(policy.fields.allowedIps.source).toBe('client');
    expect(policy.fields.dns.source).toBe('global');
  });

  test('combines multiple contributing groups in membership and entry order', () => {
    const client = createClient({
      allowedIps: ['10.10.0.0/24'],
      dns: ['9.9.9.9'],
      firewallIps: ['10.10.0.10:443/tcp'],
    });
    const policy = resolveClientEffectivePolicy({
      client,
      groups: [
        {
          id: 1,
          name: 'Customers',
          allowedIps: ['10.20.0.0/24', '172.16.0.10/32'],
          dns: ['8.8.8.8'],
          firewallIps: ['10.20.0.10:443/tcp'],
        },
        {
          id: 2,
          name: 'NAS',
          allowedIps: ['172.16.0.10/32', '192.0.2.10/32'],
          dns: ['1.0.0.1', '8.8.8.8'],
          firewallIps: ['10.20.0.10:443/tcp', '10.30.0.10:443/tcp'],
        },
      ],
      userConfig,
      firewallEnabled: true,
    });

    expect(policy.allowedIps).toEqual([
      '10.20.0.0/24',
      '172.16.0.10/32',
      '192.0.2.10/32',
    ]);
    expect(policy.dns).toEqual(['8.8.8.8', '1.0.0.1']);
    expect(policy.firewallIps).toEqual([
      '10.20.0.10:443/tcp',
      '10.30.0.10:443/tcp',
    ]);
    expect(policy.fields.allowedIps.groups).toEqual([
      { id: 1, name: 'Customers' },
      { id: 2, name: 'NAS' },
    ]);
  });

  test('grouped clients ignore individual values and fall back to global when no group contributes', () => {
    const policy = resolveClientEffectivePolicy({
      client: createClient({
        allowedIps: ['10.10.0.0/24'],
        dns: ['9.9.9.9'],
        firewallIps: ['10.10.0.10:443/tcp'],
      }),
      groups: [
        {
          id: 1,
          name: 'Empty Legacy',
          allowedIps: [],
          dns: [],
          firewallIps: [],
        },
        {
          id: 2,
          name: 'No Policy',
          allowedIps: null,
          dns: null,
          firewallIps: null,
        },
      ],
      userConfig,
      firewallEnabled: true,
    });

    expect(policy.allowedIps).toEqual(['0.0.0.0/0']);
    expect(policy.dns).toEqual(['1.1.1.1']);
    expect(policy.firewallIps).toEqual(['0.0.0.0/0']);
    expect(policy.fields.allowedIps.source).toBe('global');
    expect(policy.groupManagedAllowedIps).toBe(false);
  });

  test('generated config uses group union without changing server peer routes', () => {
    const client = createClient({
      allowedIps: ['10.10.0.0/24'],
      dns: ['9.9.9.9'],
    });
    const policy = resolveClientEffectivePolicy({
      client,
      groups: [
        {
          id: 1,
          name: 'Customers',
          allowedIps: ['10.20.0.0/24'],
          dns: ['8.8.8.8'],
          firewallIps: null,
        },
      ],
      userConfig,
      firewallEnabled: true,
    });

    const config = wg.generateClientConfig(wgInterface, userConfig, client, {
      effectivePolicy: policy,
    });
    const serverPeer = wg.generateServerPeer(client);

    expect(config).toContain('AllowedIPs = 10.20.0.0/24');
    expect(config).toContain('DNS = 8.8.8.8');
    expect(serverPeer).toContain(
      'AllowedIPs = 10.8.0.2/32, fd00::2/128, 192.168.50.0/24'
    );
    expect(serverPeer).not.toContain('10.20.0.0/24');
  });

  test('firewall runtime uses group unions while enabled and ignores groups while disabled', () => {
    const client = createClient({
      allowedIps: ['10.10.0.0/24'],
      firewallIps: ['10.10.0.10:443/tcp'],
    });
    const groups = [
      {
        id: 1,
        name: 'Customers',
        allowedIps: null,
        dns: null,
        firewallIps: ['10.20.0.10:443/tcp'],
      },
      {
        id: 2,
        name: 'NAS',
        allowedIps: null,
        dns: null,
        firewallIps: ['10.20.0.10:443/tcp', '10.30.0.10:443/tcp'],
      },
    ];

    expect(
      firewallTestExports.resolveFirewallClientIps(client, userConfig, groups)
    ).toEqual(['10.20.0.10:443/tcp', '10.30.0.10:443/tcp']);

    const disabledPolicy = resolveClientEffectivePolicy({
      client,
      groups,
      userConfig,
      firewallEnabled: false,
    });

    expect(disabledPolicy.firewallIps).toEqual([]);
    expect(disabledPolicy.groupManagedFirewallIps).toBe(false);
  });
});
