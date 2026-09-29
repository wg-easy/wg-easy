import { describe, expect, test, vi } from 'vitest';

import { wg } from '#server/utils/wgHelper';
import { exec } from '#server/utils/cmd';
import { createAwgDefaults } from '#server/utils/awgDefaults';
import {
  assertSeparateNetworks,
  interfaceForProtocol,
} from '#server/utils/protocol';
import { ClientCreateSchema } from '#db/repositories/client/types';
import { mergeClientStatuses } from '#server/utils/clientStatus';
import type { InterfaceType } from '#db/repositories/interface/types';
import type { ClientType } from '#db/repositories/client/types';
import type { UserConfigType } from '#db/repositories/userConfig/types';
import type { HooksType } from '#db/repositories/hooks/types';

vi.mock('#server/utils/config', () => ({
  WG_ENV: { WG_INTERFACE: 'wg0', CLASSIC_WG_INTERFACE: 'wg1', PORT: '51821' },
}));
vi.mock('#server/utils/cmd', () => ({ exec: vi.fn(async () => '') }));

const iface = {
  ...createAwgDefaults(),
  name: 'wg0',
  protocol: 'awg',
  privateKey: 'server-private',
  publicKey: 'server-public',
  ipv4Cidr: '10.8.0.0/24',
  ipv6Cidr: 'fd00:8::/64',
  port: 51820,
  mtu: 1420,
  routingTable: 'auto',
  device: 'eth0',
} as InterfaceType;
const client = {
  name: 'test',
  id: 1,
  privateKey: 'client-private',
  preSharedKey: 'shared',
  ipv4Address: '10.8.0.2',
  ipv6Address: 'fd00:8::2',
  mtu: 1420,
  persistentKeepalive: 25,
} as ClientType;
const config = {
  host: 'vpn.example',
  port: 51820,
  defaultDns: [],
  defaultAllowedIps: ['0.0.0.0/0'],
} as unknown as UserConfigType;
const hooks = { preUp: '', postUp: '', preDown: '', postDown: '' } as HooksType;

describe('simultaneous WG and AWG', () => {
  test('defaults existing API callers to AWG and validates the choice', () => {
    expect(
      ClientCreateSchema.parse({ name: 'test', expiresAt: null }).protocol
    ).toBe('awg');
    expect(
      ClientCreateSchema.parse({
        name: 'test',
        expiresAt: null,
        protocol: 'wg',
      }).protocol
    ).toBe('wg');
    expect(
      ClientCreateSchema.safeParse({
        name: 'test',
        expiresAt: null,
        protocol: 'wg; id',
      }).success
    ).toBe(false);
    expect(interfaceForProtocol('awg')).toBe('wg0');
    expect(interfaceForProtocol('wg')).toBe('wg1');
  });

  test('classic configs omit every AWG field even if values are present', () => {
    const classic = {
      ...iface,
      name: 'wg1',
      protocol: 'wg' as const,
      privateKey: 'wg-private',
      publicKey: 'wg-public',
      port: 51822,
    };
    const exported = wg.generateClientConfig(
      classic,
      { ...config, port: 51822 },
      client
    );
    const server = wg.generateServerInterface(classic, hooks);
    for (const text of [exported, server]) {
      expect(text).not.toMatch(
        /^(?:Jc|Jmin|Jmax|S[1-4]|H[1-4]|I[1-5]|HeaderProtectionKey|RandomTrailers|DisableCookies|ContentPaddingAddition) =/m
      );
    }
    expect(exported).toContain('PublicKey = wg-public');
    expect(exported).toContain('Endpoint = vpn.example:51822');
    expect(server).toContain('PrivateKey = wg-private');
    expect(wg.generateClientConfig(iface, config, client)).toContain(
      `HeaderProtectionKey = ${iface.headerProtectionKey}`
    );
  });

  test('dispatches each interface to its own tool', async () => {
    await wg.up('wg1', 'wg');
    await wg.up('wg0', 'awg');
    await wg.sync('wg1', 'wg');
    expect(exec).toHaveBeenCalledWith('wg-quick up wg1');
    expect(exec).toHaveBeenCalledWith('awg-quick up wg0');
    expect(exec).toHaveBeenCalledWith('wg syncconf wg1 <(wg-quick strip wg1)');
  });

  test('rejects overlapping networks in either direction', () => {
    expect(() =>
      assertSeparateNetworks(iface, {
        ipv4Cidr: '10.8.0.0/16',
        ipv6Cidr: 'fd00:9::/64',
      })
    ).toThrow();
    expect(() =>
      assertSeparateNetworks(iface, {
        ipv4Cidr: '10.9.0.0/24',
        ipv6Cidr: 'fd00:8::/80',
      })
    ).toThrow();
    expect(() =>
      assertSeparateNetworks(iface, {
        ipv4Cidr: '10.9.0.0/24',
        ipv6Cidr: 'fd00:9::/64',
      })
    ).not.toThrow();
  });

  test('never mixes stats for the same public key on different interfaces', () => {
    const base = {
      publicKey: 'same',
      latestHandshakeAt: null,
      endpoint: null,
      transferRx: 0,
      transferTx: 0,
    };
    const clients = [
      { ...base, interfaceId: 'wg0' },
      { ...base, interfaceId: 'wg1' },
    ];
    mergeClientStatuses(clients, [
      { ...base, interfaceId: 'wg1', transferRx: 42 },
    ]);
    expect(clients.map((c) => c.transferRx)).toEqual([0, 42]);
  });
});
