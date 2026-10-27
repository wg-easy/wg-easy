import { expect, test } from 'vitest';

import { databaseFixture } from '../helpers/database';

import {
  generateServerConfig,
  generateClientConfig,
} from '#server/features/vpn/configuration';
import { roles } from '#shared/utils/permissions';

async function fixture() {
  const { store } = await databaseFixture();
  await store.users.insert({
    id: 1,
    username: 'admin',
    name: 'Admin',
    role: roles.ADMIN,
    enabled: true,
    totpVerified: false,
  });
  await store.clients.insert({
    id: 1,
    userId: 1,
    interfaceId: 'wg0',
    name: 'Client',
    enabled: true,
    privateKey: 'private',
    publicKey: 'public',
    ipv4Address: '10.8.0.2',
    ipv6Address: 'fd00::2',
    serverAllowedIps: [],
    persistentKeepalive: 0,
  });
  return {
    network: await store.interfaces.get(),
    hooks: await store.hooks.get(),
    defaults: await store.userConfigs.get(),
    client: (await store.clients.get(1))!,
  };
}

test.each([false, true])(
  'renders complete configurations with Amnezia=%s',
  async (amnezia) => {
    const { network, hooks, defaults, client } = await fixture();
    const configured = {
      ...network,
      h1: '5',
      headerProtectionKey: 'header-key',
      maxHandshakeAttempts: '9',
      randomTrailers: true,
      disableCookies: false,
    };
    const server = generateServerConfig(configured, hooks, [client], {
      amnezia,
    });
    const download = generateClientConfig(
      configured,
      defaults,
      { ...client, rekeyTimeout: '4-8', disableCookies: true },
      { amnezia }
    );
    expect(server).toContain('[Interface]');
    expect(server).toContain('[Peer]\nPublicKey = public');
    if (amnezia) {
      for (const output of [server, download]) {
        expect(output).toContain('S1 = 128');
        expect(output).toContain('H1 = 5');
        expect(output).toContain('HeaderProtectionKey = header-key');
        expect(output).toContain('RandomTrailers = on');
      }
      expect(server).toContain('Jc = 7');
      expect(server).toContain('MaxHandshakeAttempts = 9');
      expect(server).toContain('DisableCookies = off');
      expect(server).not.toMatch(/^S3 =/m);
      expect(download).not.toMatch(/^Jc =|^MaxHandshakeAttempts =/m);
      expect(download).toContain('RekeyTimeout = 4-8');
      expect(download).toContain('DisableCookies = on');
    } else {
      for (const output of [server, download])
        expect(output).not.toMatch(
          /^Jc =|^S1 =|^H1 =|^RandomTrailers =|^HeaderProtectionKey =/m
        );
    }
  }
);

test('assembles only enabled peers and formats IPv4-only hooks and defaults', async () => {
  const { network, hooks, defaults, client } = await fixture();
  const server = generateServerConfig(
    network,
    { ...hooks, postUp: 'echo {{interface}}\n{{port}} {{uiPort}} {{unknown}}' },
    [client, { ...client, id: 2, publicKey: 'disabled', enabled: false }],
    { enableIpv6: false, uiPort: '8080' }
  );
  expect(server).toContain('PostUp = echo wg0 51820 8080 {{unknown}}');
  expect(server).toContain('AllowedIPs = 10.8.0.2/32');
  expect(server).not.toContain('fd00::2/128');
  expect(server).not.toContain('PublicKey = disabled');
  expect(server.endsWith('\n\n')).toBe(true);

  const config = generateClientConfig(
    network,
    {
      ...defaults,
      host: '2001:db8::1',
      defaultDns: ['1.1.1.1'],
      defaultAllowedIps: ['0.0.0.0/0'],
    },
    { ...client, preUp: 'echo one\necho two' },
    { enableIpv6: false }
  );
  expect(config).toContain('Address = 10.8.0.2/32\n');
  expect(config).toContain('DNS = 1.1.1.1');
  expect(config).toContain('AllowedIPs = 0.0.0.0/0');
  expect(config).toContain(`Endpoint = [2001:db8::1]:${defaults.port}`);
  expect(config).toContain('PreUp = echo one echo two');
  expect(
    generateClientConfig(network, defaults, { ...client, dns: [] })
  ).not.toMatch(/^DNS =/m);
});
