import { describe, expect, test, vi } from 'vitest';

import { wg } from '#server/utils/wgHelper';
import {
  ClientUpdateSchema,
  type ClientType,
} from '#db/repositories/client/types';
import type { InterfaceType } from '#db/repositories/interface/types';
import {
  UserConfigUpdateSchema,
  type UserConfigType,
} from '#db/repositories/userConfig/types';

vi.mock('#server/utils/config', () => ({
  WG_ENV: {
    WG_EXECUTABLE: 'wg',
    DISABLE_IPV6: false,
    PORT: 51821,
  },
}));

const mockInterface: InterfaceType = {
  name: 'wg0',
  device: 'eth0',
  port: 51820,
  publicKey: 'serverPublicKey=',
  privateKey: 'serverPrivateKey=',
  ipv4Cidr: '10.8.0.0/24',
  ipv6Cidr: 'fdcc:ad94:bacf:61a4::cafe:0/112',
  mtu: 1420,
  routingTable: 'auto',
  enabled: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  s1: null,
  s2: null,
  s3: null,
  s4: null,
  h1: null,
  h2: null,
  h3: null,
  h4: null,
  jc: null,
  jmin: null,
  jmax: null,
};

const mockUserConfig: UserConfigType = {
  id: 'wg0',
  defaultMtu: 1420,
  defaultPersistentKeepalive: 25,
  defaultDns: ['1.1.1.1'],
  defaultAllowedIps: ['0.0.0.0/0', '::/0'],
  defaultJC: 7,
  defaultJMin: 10,
  defaultJMax: 1000,
  defaultI1: null,
  defaultI2: null,
  defaultI3: null,
  defaultI4: null,
  defaultI5: null,
  host: 'vpn.example.com',
  port: 51820,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const baseClient: ClientType = {
  id: 1,
  userId: 1,
  interfaceId: 'wg0',
  name: 'test-client',
  ipv4Address: '10.8.0.2',
  ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:2',
  preUp: '',
  postUp: '',
  preDown: '',
  postDown: '',
  privateKey: 'clientPrivateKey=',
  publicKey: 'clientPublicKey=',
  preSharedKey: 'clientPreSharedKey=',
  expiresAt: null,
  allowedIps: null,
  serverAllowedIps: [],
  firewallIps: null,
  persistentKeepalive: 25,
  mtu: 1420,
  jC: null,
  jMin: null,
  jMax: null,
  i1: null,
  i2: null,
  i3: null,
  i4: null,
  i5: null,
  dns: null,
  serverEndpoint: null,
  enabled: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('wgHelper', () => {
  describe('generateClientConfig', () => {
    test('includes MTU when client.mtu is set', () => {
      const client = { ...baseClient, mtu: 1420 };
      const config = wg.generateClientConfig(
        mockInterface,
        mockUserConfig,
        client
      );

      expect(config).toContain('MTU = 1420');
      expect(config).toContain('PrivateKey = clientPrivateKey=');
      expect(config).toContain(
        'Address = 10.8.0.2/32, fdcc:ad94:bacf:61a4::cafe:2/128'
      );
      expect(config).toContain('PublicKey = serverPublicKey=');
      expect(config).toContain('Endpoint = vpn.example.com:51820');
    });

    test('omits MTU when client.mtu is null (auto MTU)', () => {
      const client = { ...baseClient, mtu: null };
      const config = wg.generateClientConfig(
        mockInterface,
        mockUserConfig,
        client
      );

      expect(config).not.toContain('MTU =');
      expect(config).toContain('PrivateKey = clientPrivateKey=');
      expect(config).toContain(
        'Address = 10.8.0.2/32, fdcc:ad94:bacf:61a4::cafe:2/128'
      );
      expect(config).toContain('DNS = 1.1.1.1');
      expect(config).toContain('PublicKey = serverPublicKey=');
    });

    test('omits MTU when client.mtu is undefined', () => {
      const client = {
        ...baseClient,
        mtu: undefined as unknown as number | null,
      };
      const config = wg.generateClientConfig(
        mockInterface,
        mockUserConfig,
        client
      );

      expect(config).not.toContain('MTU =');
    });

    test('omits MTU when client.mtu is 0', () => {
      const client = { ...baseClient, mtu: 0 };
      const config = wg.generateClientConfig(
        mockInterface,
        mockUserConfig,
        client
      );

      expect(config).not.toContain('MTU =');
    });

    test('generates valid config structure without MTU or DNS', () => {
      const client = { ...baseClient, mtu: null, dns: [] };
      const userConfig = { ...mockUserConfig, defaultDns: [] };
      const config = wg.generateClientConfig(mockInterface, userConfig, client);

      expect(config).not.toContain('MTU =');
      expect(config).not.toContain('DNS =');
      expect(config).toBe(`[Interface]
PrivateKey = clientPrivateKey=
Address = 10.8.0.2/32, fdcc:ad94:bacf:61a4::cafe:2/128

[Peer]
PublicKey = serverPublicKey=
PresharedKey = clientPreSharedKey=
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
Endpoint = vpn.example.com:51820`);
    });
  });

  describe('generateServerPeer', () => {
    test('generates server peer with client allowed IPs', () => {
      const peer = wg.generateServerPeer(baseClient);
      expect(peer).toContain('# Client: test-client (1)');
      expect(peer).toContain('PublicKey = clientPublicKey=');
      expect(peer).toContain('PresharedKey = clientPreSharedKey=');
      expect(peer).toContain(
        'AllowedIPs = 10.8.0.2/32, fdcc:ad94:bacf:61a4::cafe:2/128'
      );
    });
  });

  describe('schema validation', () => {
    const validClientPayload = {
      name: 'client1',
      enabled: true,
      expiresAt: null,
      ipv4Address: '10.8.0.2',
      ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:2',
      preUp: '',
      postUp: '',
      preDown: '',
      postDown: '',
      allowedIps: null,
      serverAllowedIps: [],
      firewallIps: null,
      mtu: null,
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
      dns: null,
    };

    test('ClientUpdateSchema accepts null MTU', () => {
      const result = ClientUpdateSchema.safeParse(validClientPayload);
      expect(result.success).toBe(true);
    });

    test('ClientUpdateSchema accepts numeric MTU in valid range', () => {
      const result = ClientUpdateSchema.safeParse({
        ...validClientPayload,
        mtu: 1420,
      });
      expect(result.success).toBe(true);
    });

    test('ClientUpdateSchema rejects invalid MTU', () => {
      const result = ClientUpdateSchema.safeParse({
        ...validClientPayload,
        mtu: 500,
      });
      expect(result.success).toBe(false);
    });

    const validUserConfigPayload = {
      port: 51820,
      defaultMtu: null,
      defaultPersistentKeepalive: 25,
      defaultDns: ['1.1.1.1'],
      defaultAllowedIps: ['0.0.0.0/0'],
      defaultJC: 7,
      defaultJMin: 10,
      defaultJMax: 1000,
      defaultI1: null,
      defaultI2: null,
      defaultI3: null,
      defaultI4: null,
      defaultI5: null,
      host: 'vpn.example.com',
    };

    test('UserConfigUpdateSchema accepts null defaultMtu', () => {
      const result = UserConfigUpdateSchema.safeParse(validUserConfigPayload);
      expect(result.success).toBe(true);
    });

    test('UserConfigUpdateSchema accepts numeric defaultMtu', () => {
      const result = UserConfigUpdateSchema.safeParse({
        ...validUserConfigPayload,
        defaultMtu: 1420,
      });
      expect(result.success).toBe(true);
    });

    test('UserConfigUpdateSchema rejects out-of-range defaultMtu', () => {
      const result = UserConfigUpdateSchema.safeParse({
        ...validUserConfigPayload,
        defaultMtu: 9999,
      });
      expect(result.success).toBe(false);
    });
  });
});
