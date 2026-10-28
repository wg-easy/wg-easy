import fs from 'node:fs/promises';

import { describe, expect, test, vi, onTestFinished } from 'vitest';

import { databaseFixture } from '../helpers/database';
import { resetCryptoMocks } from '../helpers/crypto';

import * as setup from '#server/features/setup';
import { getIpInformation } from '#server/utils/ip';
import { roles } from '#shared/utils/permissions';
import { wg } from '#server/utils/wgHelper';
import { firewall } from '#server/utils/firewall';
import { maintain } from '#server/features/vpn/lifecycle';
vi.mock('#server/utils/config', () => ({ WG_ENV: {} }));
vi.mock('#server/utils/ip', async (original) => ({
  ...(await original<typeof import('#server/utils/ip')>()),
  getIpInformation: vi.fn(),
}));

async function fixture() {
  const database = await databaseFixture();
  resetCryptoMocks();
  const writeConfiguration = vi.spyOn(fs, 'writeFile').mockResolvedValue();
  const sync = vi.spyOn(wg, 'sync').mockResolvedValue('');
  const restart = vi.spyOn(wg, 'restart').mockResolvedValue('');
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
    restart,
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
    expect(sync).toHaveBeenCalledExactlyOnceWith('wg0');
    await expect(
      setup.configureEndpoint('changed', 51901)
    ).rejects.toMatchObject({ status: 400 });
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
      setup.importConfiguration(
        JSON.stringify({
          server: {
            privateKey: 'imported-private',
            publicKey: 'imported-public',
            address: '10.9.0.1',
          },
          clients: {
            peer: {
              name: 'Imported',
              address: '10.9.0.2',
              privateKey: 'peer-private',
              publicKey: 'peer-public',
              preSharedKey: '',
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
              enabled: true,
            },
          },
        })
      )
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

  test.each([false, true])(
    'preserves imported keys, client addresses, and the gateway (retry=%s)',
    async (failRestart) => {
      const { store, writeConfiguration, restart, sync } = await fixture();
      await setup.createAdministrator('admin', 'a-long-password');
      const file = JSON.stringify({
        server: {
          privateKey: 'imported-private',
          publicKey: 'imported-public',
          address: '10.9.0.15',
        },
        clients: {
          peer: {
            name: 'Imported',
            address: '10.9.0.1',
            privateKey: 'peer-private',
            publicKey: 'peer-public',
            preSharedKey: null,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
            enabled: true,
          },
        },
      });
      if (failRestart) {
        restart.mockRejectedValueOnce(new Error('Restart failed'));
        await expect(setup.importConfiguration(file)).rejects.toThrow(
          'Restart failed'
        );
        expect(sync).not.toHaveBeenCalled();
        await maintain();
      } else {
        await setup.importConfiguration(file);
      }
      expect(restart).toHaveBeenCalledTimes(failRestart ? 2 : 1);
      expect(sync).toHaveBeenCalledExactlyOnceWith('wg0');
      expect(writeConfiguration.mock.lastCall?.[1]).toContain(
        'PrivateKey = imported-private'
      );
      expect(writeConfiguration.mock.lastCall?.[1]).toContain(
        'Address = 10.9.0.15/24'
      );
      expect(writeConfiguration.mock.lastCall?.[1]).toContain(
        'PublicKey = peer-public'
      );
      expect((await store.interfaces.get()).ipv4Cidr).toBe('10.9.0.15/24');
      expect(await store.clients.getAll()).toMatchObject([
        { ipv4Address: '10.9.0.1' },
      ]);
      expect(await setup.status()).toEqual({ step: 0, done: true });
    }
  );
});
