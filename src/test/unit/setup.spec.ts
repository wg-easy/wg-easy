import fs from 'node:fs/promises';

import { describe, expect, test, vi, onTestFinished } from 'vitest';

import { databaseFixture } from '../helpers/database';
import { resetCryptoMocks } from '../helpers/crypto';
import { legacyBackup } from '../helpers/legacyBackup';

import * as setup from '#server/features/setup';
import { getIpInformation } from '#server/utils/ip';
import { roles } from '#shared/utils/permissions';
import { zeroWireGuardKey } from '#shared/utils/wireguard';
import { LinuxTunnel } from '#server/utils/linuxTunnel';
import { wg } from '#server/utils/wgHelper';
import { firewall } from '#server/utils/firewall';
import { maintain } from '#server/features/vpn/lifecycle';
import { generateClientConfig } from '#server/features/vpn/configuration';
vi.mock('#server/utils/config', () => ({ WG_ENV: {} }));
vi.mock('#server/utils/ip', async (original) => ({
  ...(await original<typeof import('#server/utils/ip')>()),
  getIpInformation: vi.fn(),
}));

async function fixture() {
  const database = await databaseFixture();
  resetCryptoMocks();
  const writeConfiguration = vi.spyOn(fs, 'writeFile').mockResolvedValue();
  vi.spyOn(wg, 'dump').mockResolvedValue([]);
  const sync = vi.spyOn(wg, 'sync').mockResolvedValue('');
  vi.spyOn(LinuxTunnel.prototype, 'stop').mockResolvedValue();
  vi.spyOn(LinuxTunnel.prototype, 'checkOwnership').mockResolvedValue(
    undefined
  );
  vi.spyOn(wg, 'runHook').mockResolvedValue('');
  const up = vi.spyOn(LinuxTunnel.prototype, 'create').mockResolvedValue();
  vi.spyOn(LinuxTunnel.prototype, 'completeStartup').mockResolvedValue();
  vi.spyOn(LinuxTunnel.prototype, 'configureLink').mockResolvedValue();
  vi.spyOn(firewall, 'rebuildRules').mockResolvedValue();
  onTestFinished(() => vi.restoreAllMocks());
  const ipInformation = vi
    .mocked(getIpInformation)
    .mockReset()
    .mockResolvedValue([{ label: 'Public', value: '192.0.2.1' }]);
  return {
    ...database,
    ipInformation,
    writeConfiguration,
    sync,
    up,
  };
}

describe('setup', () => {
  test('creates the first administrator and completes endpoint setup in order', async () => {
    const { store, writeConfiguration, sync } = await fixture();
    await expect(
      setup.configureEndpoint('vpn.example.com', 51820)
    ).rejects.toMatchObject({ status: 400 });
    await setup.createAdministrator('admin', 'a-long-password');
    expect(await setup.status()).toEqual({ step: 3, done: false });
    expect(await store.users.get(1)).toMatchObject({
      role: roles.ADMIN,
      password: 'hash:a-long-password',
    });
    await expect(
      setup.createAdministrator('another', 'a-long-password')
    ).rejects.toMatchObject({ status: 400 });
    await setup.configureEndpoint('vpn.example.com', 51900);
    expect(await setup.status()).toEqual({ step: 0, done: true });
    expect(await store.userConfigs.get()).toMatchObject({
      host: 'vpn.example.com',
      port: 51900,
    });
    expect((await store.interfaces.get()).port).toBe(51900);
    expect(writeConfiguration.mock.lastCall?.[1]).toContain(
      'ListenPort = 51900'
    );
    expect(sync).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ name: 'wg0' }),
      expect.any(Array),
      true
    );
    await expect(
      setup.configureEndpoint('changed', 51901)
    ).rejects.toMatchObject({ status: 400 });
  });

  test('retains a completed setup and retries the selected listener after a host failure', async () => {
    const { up, sync } = await fixture();
    await setup.createAdministrator('admin', 'a-long-password');
    up.mockRejectedValueOnce(new Error('Tunnel unavailable'));
    await expect(
      setup.configureEndpoint('vpn.example.com', 51830)
    ).rejects.toThrow('Tunnel unavailable');
    expect(await setup.status()).toEqual({ done: true, step: 0 });
    await maintain();
    expect(sync).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ port: 51830 }),
      [],
      true
    );
  });

  test('rolls back account creation when the setup transition cannot be saved', async () => {
    const { connection, store } = await fixture();
    await connection.execute(
      "CREATE TRIGGER fail_step BEFORE UPDATE OF setup_step ON general_table BEGIN SELECT RAISE(ABORT, 'step failure'); END"
    );
    await expect(
      setup.createAdministrator('admin', 'a-long-password')
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        message: expect.stringContaining('step failure'),
      }),
    });
    expect(await store.users.count()).toBe(0);
    expect(await setup.status()).toEqual({ step: 1, done: false });
  });

  test('rolls back endpoint and port changes if completing setup fails', async () => {
    const { connection, store } = await fixture();
    await setup.createAdministrator('admin', 'a-long-password');
    const before = await store.userConfigs.get();
    const network = await store.interfaces.get();
    await connection.execute(
      "CREATE TRIGGER fail_completion BEFORE UPDATE OF setup_step ON general_table BEGIN SELECT RAISE(ABORT, 'completion failure'); END"
    );
    await expect(
      setup.configureEndpoint('changed.example.com', 51900)
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        message: expect.stringContaining('completion failure'),
      }),
    });
    expect(await store.userConfigs.get()).toEqual(before);
    expect(await store.interfaces.get()).toEqual(network);
    expect(await setup.status()).toEqual({ step: 3, done: false });
  });

  test('persists initial defaults without changing explicit gateways and skips completed setup', async () => {
    const { store } = await fixture();
    const config = {
      username: 'admin',
      password: 'a-long-password',
      host: 'vpn.example.com',
      port: 51900,
      ipv4Cidr: '10.9.0.15/24',
      ipv6Cidr: 'fd00::f/64',
      dns: ['1.1.1.1'],
    };
    await setup.initialize(config);
    expect(await setup.status()).toEqual({ step: 0, done: true });
    expect(await store.interfaces.get()).toMatchObject({
      ipv4Cidr: config.ipv4Cidr,
      ipv6Cidr: config.ipv6Cidr,
      port: 51900,
    });
    expect(await store.userConfigs.get()).toMatchObject({
      host: config.host,
      defaultDns: config.dns,
    });
    await setup.initialize({
      ...config,
      username: 'replacement',
      port: 51901,
    });
    expect(await store.users.count()).toBe(1);
    expect((await store.interfaces.get()).port).toBe(51900);
  });

  test('restores initial defaults if account creation fails', async () => {
    const { store } = await fixture();
    await store.users.insert({
      username: 'duplicate',
      name: 'Existing',
      role: roles.ADMIN,
      enabled: true,
      totpVerified: false,
    });
    const network = await store.interfaces.get();
    const defaults = await store.userConfigs.get();
    await expect(
      setup.initialize({
        username: 'duplicate',
        password: 'a-long-password',
        host: 'vpn.example.com',
        port: 51900,
        ipv4Cidr: '10.9.0.0/24',
        ipv6Cidr: 'fd00::/64',
        dns: ['1.1.1.1'],
      })
    ).rejects.toThrow('User already exists');
    expect(await store.interfaces.get()).toEqual(network);
    expect(await store.userConfigs.get()).toEqual(defaults);
    expect(await setup.status()).toEqual({ step: 1, done: false });
  });

  test('rolls back an imported configuration if setup completion fails', async () => {
    const { connection, store } = await fixture();
    await setup.createAdministrator('admin', 'a-long-password');
    const network = await store.interfaces.get();
    await connection.execute(
      "CREATE TRIGGER fail_completion BEFORE UPDATE OF setup_step ON general_table BEGIN SELECT RAISE(ABORT, 'completion failure'); END"
    );
    await expect(
      setup.importConfiguration(JSON.stringify(legacyBackup))
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        message: expect.stringContaining('completion failure'),
      }),
    });
    expect(await store.interfaces.get()).toEqual(network);
    expect(await store.clients.getAll()).toEqual([]);
    expect(await setup.status()).toEqual({ step: 3, done: false });
  });

  test('checks the setup stage before discovering host addresses', async () => {
    const { ipInformation } = await fixture();
    await expect(setup.ipInformation()).rejects.toMatchObject({
      status: 400,
    });
    expect(ipInformation).not.toHaveBeenCalled();
    await setup.createAdministrator('admin', 'a-long-password');
    expect(await setup.ipInformation()).toEqual([
      { label: 'Public', value: '192.0.2.1' },
    ]);
    expect(ipInformation).toHaveBeenCalledWith('wg0');
  });

  const {
    server,
    clients: { peer },
  } = legacyBackup;
  test.each([
    ['a malformed key', { publicKey: 'invalid' }, 'publicKey'],
    ['an all-zero private key', { privateKey: zeroWireGuardKey }, 'privateKey'],
    ['a mismatched key pair', { privateKey: peer.privateKey }, 'publicKey'],
    ['the server key', { publicKey: server.publicKey }, 'publicKey'],
    ['a repeated peer key', { publicKey: peer.publicKey }, 'publicKey'],
    ['the gateway address', { address: server.address }, 'address'],
    ['a repeated address', { address: peer.address }, 'address'],
    ['a multiline name', { name: 'two\nlines' }, 'name'],
  ] as const)(
    'rejects %s on a disabled peer and rolls back the import',
    async (_, fields, field) => {
      const { store, writeConfiguration } = await fixture();
      await setup.createAdministrator('admin', 'a-long-password');
      const second = {
        ...peer,
        enabled: false,
        address: '10.9.0.2',
        privateKey: null,
        publicKey: Buffer.alloc(32, 7).toString('base64'),
        ...fields,
      };
      await expect(
        setup.importConfiguration(
          JSON.stringify({ server, clients: { peer, second } })
        )
      ).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining(`clients.1.${field}`),
      });
      expect(await store.clients.getAll()).toEqual([]);
      expect((await setup.status()).step).toBe(3);
      expect(writeConfiguration).not.toHaveBeenCalled();
    }
  );

  test('rejects reserved client IDs instead of silently dropping a peer', async () => {
    await fixture();
    await setup.createAdministrator('admin', 'a-long-password');
    const clients = { ['__proto__']: peer };
    await expect(
      setup.importConfiguration(JSON.stringify({ server, clients }))
    ).rejects.toMatchObject({ status: 400 });
  });

  test.each(['', null, zeroWireGuardKey])(
    'imports a public-key-only peer with a disabled preshared key (%s)',
    async (preSharedKey) => {
      const { store } = await fixture();
      await setup.createAdministrator('admin', 'a-long-password');
      const clients = {
        peer: { ...peer, privateKey: undefined, preSharedKey },
      };
      await setup.importConfiguration(JSON.stringify({ server, clients }));
      expect(await store.clients.getAll()).toMatchObject([
        { publicKey: peer.publicKey, privateKey: null, preSharedKey: null },
      ]);
    }
  );

  test.each([false, true])(
    'preserves imported keys, client addresses, and the gateway (retry=%s)',
    async (failRestart) => {
      const { store, writeConfiguration, up, sync } = await fixture();
      await setup.createAdministrator('admin', 'a-long-password');
      const file = JSON.stringify(legacyBackup);
      if (failRestart) {
        up.mockRejectedValueOnce(new Error('Restart failed'));
        await expect(setup.importConfiguration(file)).rejects.toThrow(
          'Restart failed'
        );
        expect(sync).not.toHaveBeenCalled();
        await maintain();
      } else {
        await setup.importConfiguration(file);
      }
      expect(up).toHaveBeenCalledTimes(failRestart ? 2 : 1);
      expect(sync).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ name: 'wg0' }),
        expect.any(Array),
        true
      );
      expect(writeConfiguration.mock.lastCall?.[1]).toContain(
        `PrivateKey = ${server.privateKey}`
      );
      expect(writeConfiguration.mock.lastCall?.[1]).toContain(
        'Address = 10.9.0.15/24'
      );
      expect(writeConfiguration.mock.lastCall?.[1]).toContain(
        `PublicKey = ${peer.publicKey}`
      );
      expect((await store.interfaces.get()).ipv4Cidr).toBe('10.9.0.15/24');
      expect(await store.clients.getAll()).toMatchObject([
        { ipv4Address: '10.9.0.1', preSharedKey: peer.preSharedKey },
      ]);
      expect(await setup.status()).toEqual({ step: 0, done: true });
    }
  );

  test('leaves imported clients on the global DNS and allowed IPs', async () => {
    const { store } = await fixture();
    await setup.createAdministrator('admin', 'a-long-password');
    await setup.importConfiguration(JSON.stringify(legacyBackup));
    const [client] = await store.clients.getAll();
    expect(client).toMatchObject({ dns: null, allowedIps: null });

    await store.userConfigs.update({
      defaultDns: ['9.9.9.9'],
      defaultAllowedIps: ['10.0.0.0/8'],
    });
    const config = generateClientConfig(
      await store.interfaces.get(),
      await store.userConfigs.get(),
      client!
    );
    expect(config).toContain('DNS = 9.9.9.9');
    expect(config).toContain('AllowedIPs = 10.0.0.0/8');
  });
});
