import { describe, expect, it } from 'vitest';

import { InterfaceUpdateSchema } from '#db/repositories/interface/types';
import { UserConfigUpdateSchema } from '#db/repositories/userConfig/types';

describe('AmneziaWG 3+ parameter validation', () => {
  it('accepts interface parameters for AmneziaWG 3+', async () => {
    const result = await InterfaceUpdateSchema.parseAsync({
      ipv4Cidr: '10.8.0.0/24',
      ipv6Cidr: 'fdcc:ad:23::/64',
      mtu: 1420,
      routingTable: 'auto',
      jC: 7,
      jMin: 10,
      jMax: 1000,
      s1: 128,
      s2: 56,
      s3: null,
      s4: null,
      h1: null,
      h2: null,
      h3: null,
      h4: null,
      i1: null,
      i2: null,
      i3: null,
      i4: null,
      i5: null,
      port: 51820,
      device: 'eth0',
      enabled: true,
      firewallEnabled: false,
      headerProtectionKey: 'test-key',
      contentPaddingAddition: 32,
      rekeyAfterTime: 120,
      rekeyTimeout: 60,
    });

    expect(result.headerProtectionKey).toBe('test-key');
    expect(result.contentPaddingAddition).toBe(32);
    expect(result.rekeyAfterTime).toBe(120);
    expect(result.rekeyTimeout).toBe(60);
  });

  it('accepts default config parameters for AmneziaWG 3+', async () => {
    const result = await UserConfigUpdateSchema.parseAsync({
      port: 51820,
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
      host: 'example.com',
      headerProtectionKey: 'config-key',
      contentPaddingAddition: 16,
      rekeyAfterTime: 90,
      rekeyTimeout: 30,
    });

    expect(result.headerProtectionKey).toBe('config-key');
    expect(result.contentPaddingAddition).toBe(16);
    expect(result.rekeyAfterTime).toBe(90);
    expect(result.rekeyTimeout).toBe(30);
  });
});
