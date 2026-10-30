import { describe, expect, test, vi } from 'vitest';

import { vpnFixture } from '../helpers/vpn';

import { roles } from '#shared/utils/permissions';
import * as vpn from '#server/features/vpn/lifecycle';
import * as clients from '#server/features/vpn/clients';
import * as settings from '#server/features/vpn/interface';
import * as provisioning from '#server/features/vpn/provisioning';
import * as queries from '#server/features/vpn/queries';
import { ClientQuerySchema } from '#shared/contracts/client';

const admin = { id: 1, role: roles.ADMIN };

describe('VPN operations', () => {
  test('refuses to start without required firewall tools and preserves the setting', async () => {
    const { store, commands, firewall } = await vpnFixture();
    await store.interfaces.update({ firewallEnabled: true });
    firewall.isAvailable.mockResolvedValue(false);
    await expect(vpn.start()).rejects.toThrow('Refusing to start the VPN');
    expect((await store.interfaces.get()).firewallEnabled).toBe(true);
    expect(commands.up).not.toHaveBeenCalled();
  });

  test('cannot start the VPN if traffic cannot be blocked', async () => {
    const { store, commands, firewall } = await vpnFixture();
    await store.interfaces.update({ firewallEnabled: true });
    firewall.blockTraffic.mockRejectedValue(new Error('Firewall unavailable'));
    await expect(vpn.start()).rejects.toThrow('Firewall unavailable');
    expect(commands.up).not.toHaveBeenCalled();
  });

  test.each(['start', 'restart', 'sync'] as const)(
    'protects traffic before %s and does not unblock a failed application',
    async (mode) => {
      const { store, commands, firewall } = await vpnFixture();
      await store.interfaces.update({ firewallEnabled: true });
      commands[mode === 'start' ? 'up' : mode].mockImplementation(async () => {
        expect(firewall.blockTraffic).toHaveBeenCalledWith('wg0', true);
        throw new Error('WireGuard unavailable');
      });
      await expect(
        mode === 'sync' ? clients.apply(admin, 1, 'disable') : vpn[mode]()
      ).rejects.toThrow('WireGuard unavailable');
      expect(firewall.rebuildRules).not.toHaveBeenCalled();
    }
  );

  test('only enabled, saved peers retain access when configuration sync fails', async () => {
    const { store, commands } = await vpnFixture();
    await store.interfaces.update({ firewallEnabled: false });
    await store.clients.insert({
      ...(await store.clients.get(1))!,
      id: 2,
      publicKey: 'revoked',
      ipv4Address: '10.8.0.3',
      ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:3',
    });
    const active = new Set(['public', 'revoked', 'deleted']);
    commands.dump.mockResolvedValue(
      [...active].map((publicKey) => ({
        publicKey,
        preSharedKey: '',
        endpoint: null,
        allowedIps: '',
        latestHandshakeAt: null,
        transferRx: 0,
        transferTx: 0,
        persistentKeepalive: '0',
      }))
    );
    commands.removePeer.mockImplementation(async (_name, publicKey) => {
      active.delete(publicKey);
      return '';
    });
    commands.sync.mockImplementation(async () => {
      expect(active).toEqual(new Set(['public']));
      throw new Error('Configuration unavailable');
    });
    await expect(clients.apply(admin, 2, 'disable')).rejects.toThrow(
      'Configuration unavailable'
    );
    expect(active).toEqual(new Set(['public']));
  });

  test('serializes updates and uses one snapshot for configuration and firewall', async () => {
    const { commands, writeConfiguration, firewall, store } =
      await vpnFixture();
    const gate = Promise.withResolvers<string>();
    const entered = Promise.withResolvers<undefined>();
    commands.sync.mockImplementationOnce(() => {
      entered.resolve(undefined);
      return gate.promise;
    });
    const first = clients.apply(admin, 1, 'enable');
    await entered.promise;
    // Change desired state while the preceding snapshot is still being applied.
    await store.clients.update(1, { enabled: false });
    const second = clients.apply(admin, 1, 'disable');
    expect(writeConfiguration).toHaveBeenCalledTimes(1);
    expect(firewall.rebuildRules).not.toHaveBeenCalled();
    gate.resolve('');
    await Promise.all([first, second]);

    expect(writeConfiguration.mock.calls[0]?.[1]).toContain(
      'PublicKey = public'
    );
    expect(firewall.rebuildRules.mock.calls[0]?.[1][0]?.enabled).toBe(true);
    expect(writeConfiguration.mock.calls[1]?.[1]).not.toContain(
      'PublicKey = public'
    );
    expect(firewall.rebuildRules.mock.calls[1]?.[1][0]?.enabled).toBe(false);
  });

  test('can apply saved state after a failed update', async () => {
    const { commands, firewall, store } = await vpnFixture();
    commands.sync.mockRejectedValueOnce(new Error('Device unavailable'));
    await expect(clients.apply(admin, 1, 'disable')).rejects.toThrow(
      'Device unavailable'
    );
    expect((await store.clients.get(1))?.enabled).toBe(false);
    expect(firewall.rebuildRules).not.toHaveBeenCalled();
    await vpn.maintain();
    expect(commands.sync).toHaveBeenCalledTimes(2);
    expect(firewall.rebuildRules.mock.calls[0]?.[1][0]?.enabled).toBe(false);
  });

  test.each(['configuration', 'WireGuard', 'firewall'])(
    'retries expiry after a failed %s application without another expiry',
    async (stage) => {
      const { store, commands, writeConfiguration, firewall } =
        await vpnFixture();
      await store.clients.update(1, { expiresAt: '2000-01-01' });
      const error = new Error('Host unavailable');
      if (stage === 'configuration')
        writeConfiguration.mockRejectedValueOnce(error);
      if (stage === 'WireGuard') commands.sync.mockRejectedValueOnce(error);
      if (stage === 'firewall')
        firewall.rebuildRules.mockRejectedValueOnce(error);

      await expect(vpn.maintain()).rejects.toThrow(error);
      expect((await store.clients.get(1))?.enabled).toBe(false);
      await vpn.maintain();
      expect(writeConfiguration).toHaveBeenCalledTimes(2);
      expect(writeConfiguration.mock.lastCall?.[1]).not.toContain(
        'PublicKey = public'
      );
      expect(firewall.rebuildRules.mock.lastCall?.[1][0]?.enabled).toBe(false);
      await vpn.maintain();
      expect(writeConfiguration).toHaveBeenCalledTimes(2);
    }
  );

  test('retries a failed restart as a restart', async () => {
    const { commands } = await vpnFixture();
    commands.restart.mockRejectedValueOnce(new Error('Restart failed'));
    await expect(vpn.restart()).rejects.toThrow('Restart failed');
    await vpn.maintain();
    expect(commands.restart).toHaveBeenCalledTimes(2);
    expect(commands.sync).toHaveBeenCalledOnce();
  });

  test('retries a failed start without replacing the initialized server identity', async () => {
    const { store, commands } = await vpnFixture();
    commands.up.mockRejectedValueOnce(new Error('Device unavailable'));
    await expect(vpn.start()).rejects.toThrow('Device unavailable');
    const initialized = await store.interfaces.get();
    expect(initialized).toMatchObject({
      privateKey: 'new-private',
      publicKey: 'new-public',
    });

    await vpn.maintain();

    expect(commands.up).toHaveBeenCalledTimes(2);
    expect(commands.sync).toHaveBeenCalledOnce();
    expect(commands.generatePrivateKey).toHaveBeenCalledOnce();
    expect(await store.interfaces.get()).toEqual(initialized);
    await vpn.maintain();
    expect(commands.up).toHaveBeenCalledTimes(2);
    expect(commands.sync).toHaveBeenCalledOnce();
  });

  test.each([-1, 0, 1])(
    'cleans up one-time links at their deadline without changing peer access (offset %i ms)',
    async (offset) => {
      const { store, commands, writeConfiguration, firewall } =
        await vpnFixture();
      const deadline = Date.parse('2026-10-27T00:00:00Z');
      vi.spyOn(Date, 'now').mockReturnValue(deadline + offset);
      await store.oneTimeLinks.save(
        1,
        'download-token',
        new Date(deadline).toISOString()
      );
      const peer = await store.clients.get(1);

      await vpn.maintain();

      const link = await store.oneTimeLinks.getByToken('download-token');
      if (offset < 0) expect(link).toBeDefined();
      else expect(link).toBeUndefined();
      expect(await store.clients.get(1)).toEqual(peer);
      expect(writeConfiguration).not.toHaveBeenCalled();
      expect(commands.sync).not.toHaveBeenCalled();
      expect(firewall.rebuildRules).not.toHaveBeenCalled();
    }
  );

  describe.each([
    '2026-10-27',
    '2026-10-27T00:00:00.000Z',
    '2026-10-27T02:00:00+02:00',
  ])('expiry represented as %s', (expiresAt) => {
    test.each([-1, 0, 1])(
      'listing, enabling, and maintenance agree at deadline offset %i ms',
      async (offset) => {
        const { store } = await vpnFixture();
        vi.spyOn(Date, 'now').mockReturnValue(
          Date.parse('2026-10-27T00:00:00Z') + offset
        );
        await store.clients.update(1, { expiresAt });
        const expired = offset >= 0;

        for (const expiry of ['expired', 'expiring'] as const) {
          const result = await queries.list(
            admin,
            ClientQuerySchema.parse({ expiry })
          );
          expect(result.clients.some(({ id }) => id === 1)).toBe(
            expiry === 'expired' ? expired : !expired
          );
        }

        for (const enable of [
          () => clients.apply(admin, 1, 'enable'),
          () => clients.bulk(admin, { action: 'enable', clientIds: [1] }),
        ]) {
          if (expired)
            await expect(enable()).rejects.toMatchObject({ status: 422 });
          else await enable();
        }
        await vpn.maintain();
        expect((await store.clients.get(1))?.enabled).toBe(!expired);
      }
    );
  });

  test('keeps CIDR and every address unchanged if allocation fails', async () => {
    const { writeConfiguration, store } = await vpnFixture();
    const network = await store.interfaces.get();
    const beforeClients = await store.clients.getAll();
    await expect(
      settings.updateCidr(admin, {
        ipv4Cidr: '192.0.2.0/32',
        ipv6Cidr: network.ipv6Cidr,
      })
    ).rejects.toThrow();
    expect(await store.interfaces.get()).toEqual(network);
    expect(await store.clients.getAll()).toEqual(beforeClients);
    expect(writeConfiguration).not.toHaveBeenCalled();
  });

  test.each([
    ['details', queries.get],
    ['configuration', provisioning.download],
    ['one-time link', provisioning.generateOneTimeLink],
  ] as const)(
    '%s does not disclose whether an unowned client exists',
    async (_name, operation) => {
      const { store, commands, writeConfiguration } = await vpnFixture();
      const before = await store.clients.getAll();
      const actor = { id: 2, role: roles.CLIENT };
      for (const id of [1, 999]) {
        await expect(operation(actor, id)).rejects.toMatchObject({
          status: 403,
          statusText: 'Permission denied',
        });
      }
      expect(await store.clients.getAll()).toEqual(before);
      expect(commands.dump).not.toHaveBeenCalled();
      expect(writeConfiguration).not.toHaveBeenCalled();
    }
  );

  test('returns the authorized client configuration', async () => {
    await vpnFixture();
    const download = await provisioning.download(admin, 1);
    expect(download.filename).toBe('Client.conf');
    expect(download.contents).toContain('PrivateKey = private');
  });

  test('rejects unknown one-time links', async () => {
    await vpnFixture();
    await expect(
      provisioning.redeemOneTimeLink("' OR 1=1 --")
    ).rejects.toMatchObject({ status: 404 });
  });

  test('only explicit reissue renews a one-time link for five minutes', async () => {
    const { store } = await vpnFixture();
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    await provisioning.generateOneTimeLink(admin, 1);
    const [client] = await store.clients.getAll();
    const token = client!.oneTimeLink!.oneTimeLink;

    clock.mockReturnValue(now + 300_000);
    await expect(provisioning.redeemOneTimeLink(token)).rejects.toMatchObject({
      status: 410,
    });

    await provisioning.generateOneTimeLink(admin, 1);
    clock.mockReturnValue(now + 599_999);
    await provisioning.redeemOneTimeLink(token);
    clock.mockReturnValue(now + 600_000);
    await expect(provisioning.redeemOneTimeLink(token)).rejects.toMatchObject({
      status: 410,
    });
  });

  test.each([
    {
      deadline: 'redemption grace period',
      firstDownload: 60_000,
      expiry: 70_000,
    },
    { deadline: 'original lifetime', firstDownload: 299_000, expiry: 300_000 },
  ])(
    'repeated downloads cannot extend the $deadline',
    async ({ firstDownload, expiry }) => {
      const { store } = await vpnFixture();
      const now = Date.now();
      const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
      await provisioning.generateOneTimeLink(admin, 1);
      const [client] = await store.clients.getAll();
      const token = client!.oneTimeLink!.oneTimeLink;

      const expected = await provisioning.download(admin, 1);
      clock.mockReturnValue(now + firstDownload);
      expect(await provisioning.redeemOneTimeLink(token)).toEqual(expected);
      clock.mockReturnValue(now + expiry - 1);
      expect(await provisioning.redeemOneTimeLink(token)).toEqual(expected);
      clock.mockReturnValue(now + expiry);
      await expect(provisioning.redeemOneTimeLink(token)).rejects.toMatchObject(
        {
          status: 410,
        }
      );
    }
  );

  test('initializes keys and AWG parameters before starting the runtime', async () => {
    const { commands, writeConfiguration, firewall, store } =
      await vpnFixture();
    await store.interfaces.update({ h1: '0' });
    await vpn.start();
    expect(await store.interfaces.get()).toMatchObject({
      privateKey: 'new-private',
      publicKey: 'new-public',
    });
    const initialized = await store.interfaces.get();
    expect(
      new Set([initialized.h1, initialized.h2, initialized.h3, initialized.h4])
        .size
    ).toBe(4);
    expect(writeConfiguration.mock.calls[0]?.[1]).toContain(
      'PrivateKey = new-private'
    );
    expect(commands.up).toHaveBeenCalledWith('wg0');
    expect(firewall.rebuildRules).toHaveBeenCalledOnce();
    await vpn.stop();
    expect(commands.down).toHaveBeenCalledTimes(2);
  });

  test('preserves status codes when a client is missing', async () => {
    await vpnFixture();
    await expect(clients.apply(admin, 999, 'disable')).rejects.toMatchObject({
      status: 404,
      message: 'Client not found',
    });
  });
});
