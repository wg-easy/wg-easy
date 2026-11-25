import { describe, expect, test, vi } from 'vitest';
import { createError } from 'nuxt/server';

import { vpnFixture } from '../helpers/vpn';

import { zeroWireGuardKey } from '#shared/utils/wireguard';
import { roles } from '#shared/utils/permissions';
import * as vpn from '#server/features/vpn/lifecycle';
import * as recovery from '#server/features/vpn/tunnelRecord';
import { LinuxTunnel } from '#server/utils/linuxTunnel';
import { SiteRoutes } from '#server/features/vpn/siteRoutes';
import * as clients from '#server/features/vpn/clients';
import * as settings from '#server/features/vpn/interface';
import * as provisioning from '#server/features/vpn/provisioning';
import * as queries from '#server/features/vpn/queries';
import { ClientQuerySchema } from '#shared/contracts/client';
import * as cmd from '#server/utils/cmd';

const admin = { id: 1, role: roles.ADMIN };

describe('VPN operations', () => {
  test.each(['firewall', 'site', 'peer', 'start', 'restart'] as const)(
    'rejects an unsupported IPv6 conntrack match before applying %s',
    async (operation) => {
      const { store, commands, firewall } = await vpnFixture();
      const site = '2001:db8:1::/64';
      await store.interfaces.update({
        firewallEnabled: operation !== 'firewall',
      });
      await store.clients.update(1, {
        enabled: operation !== 'peer',
        serverAllowedIps: operation === 'site' ? [] : [site],
      });
      const exec = vi.spyOn(cmd, 'exec').mockImplementation(async (command) => {
        if (command.includes('-m conntrack')) {
          throw new Error('match unavailable');
        }
        return '';
      });
      const changes = {
        firewall: () =>
          vpn.commit((tx) => tx.interfaces.update({ firewallEnabled: true })),
        site: () =>
          vpn.commit((tx) =>
            tx.clients.update(1, { serverAllowedIps: [site] })
          ),
        peer: () => clients.bulk(admin, { action: 'enable', clientIds: [1] }),
        start: () => vpn.start(),
        restart: () => vpn.restart(),
      };

      await expect(changes[operation]()).rejects.toMatchObject({
        status: 422,
        message: expect.stringMatching(/IPv6.*conntrack.*ip6tables/),
      });
      expect((await store.interfaces.get()).firewallEnabled).toBe(
        operation !== 'firewall'
      );
      expect(await store.clients.get(1)).toMatchObject({
        enabled: operation !== 'peer',
        serverAllowedIps: operation === 'site' ? [] : [site],
      });
      expect(firewall.blockTraffic).not.toHaveBeenCalled();
      expect(commands.down).not.toHaveBeenCalled();
      expect(commands.sync).not.toHaveBeenCalled();
      const calls = exec.mock.calls.map(([command]) => command);
      expect(calls.every((command) => command.startsWith('ip6tables '))).toBe(
        true
      );
      const chain = calls[0]?.split(' ').at(-1);
      expect(chain).toMatch(/^WG_CT_/);
      expect(calls).toEqual([
        `ip6tables -w 2 -N ${chain}`,
        `ip6tables -w 2 -A ${chain} -m conntrack --ctstate ESTABLISHED --ctdir REPLY -j ACCEPT`,
        `ip6tables -w 2 -F ${chain} && ip6tables -w 2 -X ${chain}`,
      ]);
    }
  );

  test('checks only newly required families and allows revocation after a failed check', async () => {
    const { store } = await vpnFixture();
    await store.interfaces.update({ firewallEnabled: true });
    const ipv4 = '192.0.2.0/24';
    const ipv6 = '2001:db8:1::/64';
    await store.clients.update(1, { serverAllowedIps: [ipv4] });
    const checked: string[] = [];
    vi.spyOn(cmd, 'exec').mockImplementation(async (command) => {
      if (command.includes('-m conntrack')) {
        checked.push(command.split(' ')[0]!);
        throw new Error('match unavailable');
      }
      return '';
    });
    await expect(
      vpn.commit((tx) =>
        tx.clients.update(1, { serverAllowedIps: [ipv4, ipv6] })
      )
    ).rejects.toThrow('IPv6');
    await clients.apply(admin, 1, 'disable');
    expect((await store.clients.get(1))?.enabled).toBe(false);
    expect(checked).toEqual(['ip6tables']);
  });

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
    expect(commands.sync).not.toHaveBeenCalled();
    expect(commands.runHook).not.toHaveBeenCalled();
  });

  test('holds a failed boot hook across process starts until an explicit restart', async () => {
    const { store, commands } = await vpnFixture();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await store.hooks.update({ preUp: '', postUp: 'broken hook' });
    commands.runHook.mockRejectedValueOnce(new Error('failed'));
    await vpn.start();
    expect(recovery.writeHookMarker).toHaveBeenCalledWith('wg0');
    expect((await settings.get(admin)).restartRequired).toBe(true);

    await vpn.stop();
    await vpn.start();
    await expect(
      vpn.commit((tx) => tx.hooks.update({ postUp: 'fixed hook' }))
    ).rejects.toThrow('PostUp failed');
    await vpn.maintain();
    expect(commands.runHook).toHaveBeenCalledTimes(1);

    await vpn.restart();
    expect(commands.runHook).toHaveBeenLastCalledWith(
      'wg0',
      'auto',
      'fixed hook'
    );
    expect((await settings.get(admin)).restartRequired).toBe(false);
    expect(await recovery.readPostUpMarker()).toBeUndefined();
  });

  test('skips PostUp when its pending marker cannot be saved', async () => {
    const { store, commands } = await vpnFixture();
    await store.hooks.update({ preUp: '', postUp: 'hook' });
    vi.mocked(recovery.writeHookMarker).mockRejectedValueOnce(
      new Error('Storage full')
    );
    await expect(vpn.restart()).rejects.toThrow('Storage full');
    expect(commands.runHook).not.toHaveBeenCalled();
    expect(commands.down).toHaveBeenLastCalledWith('wg0', true);
    await vpn.maintain();
    expect(commands.runHook).toHaveBeenCalledOnce();
  });

  test('repairs routes and filtering and acknowledges a successful PostUp at shutdown after a journal error', async () => {
    const { store, commands, firewall } = await vpnFixture();
    await store.interfaces.update({ firewallEnabled: true });
    await store.hooks.update({ preUp: '', postUp: 'hook' });
    const sites = vi.spyOn(SiteRoutes.prototype, 'sync');
    vi.mocked(recovery.clearPostUpFailure).mockRejectedValueOnce(
      new Error('Journal unavailable')
    );
    await expect(vpn.restart()).rejects.toThrow('Journal unavailable');
    expect(sites).toHaveBeenCalledTimes(2);
    expect(firewall.rebuildRules).toHaveBeenCalledTimes(2);
    expect(commands.runHook).toHaveBeenCalledOnce();
    await vpn.stop();
    expect(await recovery.readPostUpMarker()).toBeUndefined();
    await vpn.start();
    expect(commands.up).toHaveBeenCalledTimes(2);
    expect((await settings.get(admin)).restartRequired).toBe(false);
  });

  test('cleans up the recorded interface when the configured interface was renamed', async () => {
    const { commands } = await vpnFixture();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await recovery.writeHookMarker('old0');
    await vpn.start();
    expect(commands.down).toHaveBeenCalledWith('old0', true);
    expect(commands.up).not.toHaveBeenCalled();
    await vpn.restart();
    expect(commands.up.mock.lastCall?.[0].name).toBe('wg0');
  });

  test.each(['start', 'restart', 'sync'] as const)(
    'protects traffic before %s and does not unblock a failed application',
    async (mode) => {
      const { store, commands, firewall } = await vpnFixture();
      await store.interfaces.update({ firewallEnabled: true });
      commands.sync.mockImplementation(async () => {
        expect(firewall.blockTraffic).toHaveBeenCalledWith('wg0', true);
        throw new Error('WireGuard unavailable');
      });
      await expect(
        mode === 'sync' ? clients.apply(admin, 1, 'disable') : vpn[mode]()
      ).rejects.toThrow('WireGuard unavailable');
      expect(firewall.rebuildRules).not.toHaveBeenCalled();
    }
  );

  test.each(['file write', 'peer sync'])(
    'only enabled, saved peers retain access when %s fails',
    async (stage) => {
      const { store, commands, writeConfiguration } = await vpnFixture();
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
      const fail = async () => {
        expect(active).toEqual(new Set(['public']));
        throw new Error('Configuration unavailable');
      };
      if (stage === 'file write') {
        writeConfiguration.mockImplementationOnce(fail);
      } else {
        commands.sync.mockImplementationOnce(fail);
      }
      await expect(clients.apply(admin, 2, 'disable')).rejects.toThrow(
        'Configuration unavailable'
      );
      expect(active).toEqual(new Set(['public']));
    }
  );

  test.each(['save', 'sync'])(
    'a rotated PSK excludes old traffic and overlapping site ranges after a failed %s',
    async (stage) => {
      const { store, commands, firewall, writeConfiguration } =
        await vpnFixture();
      await store.interfaces.update({ firewallEnabled: true });
      const gateway = (await store.clients.get(1))!;
      await store.clients.update(1, {
        serverAllowedIps: ['192.0.2.0/24'],
        preSharedKey: null,
      });
      await store.clients.insert({
        ...gateway,
        id: 2,
        publicKey: 'rotated',
        ipv4Address: '10.8.0.3',
        ipv6Address: 'fd00::3',
        preSharedKey: 'old-key',
        serverAllowedIps: ['192.0.2.128/25'],
      });
      await store.clients.insert({
        ...gateway,
        id: 3,
        publicKey: 'unaffected',
        ipv4Address: '10.8.0.4',
        ipv6Address: 'fd00::4',
        preSharedKey: zeroWireGuardKey,
      });
      commands.dump.mockResolvedValue(
        [
          ['public', zeroWireGuardKey, '10.8.0.2/32,192.0.2.0/24'],
          ['rotated', 'old-key', '10.8.0.3/32,192.0.2.128/25'],
          ['unaffected', '(none)', '10.8.0.4/32'],
        ].map(([publicKey, preSharedKey, allowedIps]) => ({
          publicKey: publicKey!,
          preSharedKey: preSharedKey!,
          allowedIps: allowedIps!,
          endpoint: null,
          latestHandshakeAt: null,
          transferRx: 0,
          transferTx: 0,
          persistentKeepalive: '0',
        }))
      );
      (stage === 'save'
        ? writeConfiguration
        : commands.sync
      ).mockRejectedValueOnce(new Error('Endpoint unavailable'));
      await expect(
        vpn.commit((tx) => tx.clients.update(2, { preSharedKey: 'new-key' }))
      ).rejects.toThrow('Endpoint unavailable');
      expect(firewall.rebuildRules.mock.lastCall?.[1]).toMatchObject([
        { id: 1, ipv4Address: '10.8.0.2', serverAllowedIps: [] },
        { id: 3, ipv4Address: '10.8.0.4' },
      ]);
    }
  );

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
      if (stage === 'configuration') {
        writeConfiguration.mockRejectedValueOnce(error);
      }
      if (stage === 'WireGuard') {
        commands.sync.mockRejectedValueOnce(error);
      }
      if (stage === 'firewall') {
        firewall.rebuildRules.mockRejectedValueOnce(error);
      }

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
    commands.up.mockRejectedValueOnce(new Error('Restart failed'));
    await expect(vpn.restart()).rejects.toThrow('Restart failed');
    await vpn.maintain();
    expect(commands.up).toHaveBeenCalledTimes(2);
    expect(commands.sync).toHaveBeenCalledOnce();
  });

  test.each(['start', 'restart'] as const)(
    'retains down hooks and retries their recovery write live after %s',
    async (mode) => {
      const { commands, store, firewall } = await vpnFixture();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const persist = vi
        .spyOn(LinuxTunnel.prototype, 'persistDownHooks')
        .mockResolvedValueOnce(new Error('Recovery volume unavailable'))
        .mockResolvedValue(undefined);
      await store.interfaces.update({ firewallEnabled: true });
      await store.hooks.update({
        preUp: '',
        postUp: 'up',
        postDown: 'applied down',
      });

      if (mode === 'start') {
        await vpn.start();
      } else {
        await expect(vpn.restart()).rejects.toThrow(
          'Recovery volume unavailable'
        );
      }
      const arm = vi.mocked(LinuxTunnel.prototype.armDownHooks);
      expect(arm).toHaveBeenCalledOnce();
      expect(arm.mock.calls[0]?.[1].postDown).toBe('applied down');
      expect(arm.mock.invocationCallOrder[0]).toBeLessThan(
        persist.mock.invocationCallOrder[0]!
      );
      expect(firewall.rebuildRules).toHaveBeenCalledTimes(2);
      await store.hooks.update({ postDown: 'for next generation' });
      await vpn.maintain();
      expect(persist).toHaveBeenCalledTimes(2);
      expect(arm).toHaveBeenCalledOnce();
      expect(commands.up).toHaveBeenCalledOnce();
      expect(commands.runHook).toHaveBeenCalledExactlyOnceWith(
        'wg0',
        'auto',
        'up'
      );
      expect(commands.down).toHaveBeenCalledOnce();
    }
  );

  test('restarts for changes to the managed default families or table and syncs ordinary edits live', async () => {
    const { commands, store } = await vpnFixture();
    const configure = vi.mocked(LinuxTunnel.prototype.configureLink);
    const routes = (serverAllowedIps: string[]) =>
      vpn.commit((tx) => tx.clients.update(1, { serverAllowedIps }));
    const table = (routingTable: string) =>
      vpn.commit((tx) => tx.interfaces.update({ routingTable }));

    await vpn.start();
    const { port, device } = await store.interfaces.get();
    await store.interfaces.update({ port: 51830, device: 'lo' });
    await routes(['10.1.2.3/0']);
    await routes(['0.0.0.0/0', '192.0.2.0/24']);
    await routes(['0.0.0.0/0', '::/0']);
    await table('010');
    await table('8');
    await clients.apply(admin, 1, 'disable');
    await table('off');
    await clients.apply(admin, 1, 'enable');
    expect(configure.mock.calls.map(([, , tables]) => tables)).toEqual([
      {},
      { ipv4: 'auto' },
      { ipv4: 'auto', ipv6: 'auto' },
      { ipv4: 8, ipv6: 8 },
      {},
    ]);
    expect(commands.up).toHaveBeenCalledTimes(5);
    expect(commands.sync).toHaveBeenCalledTimes(9);
    for (const [network] of commands.up.mock.calls) {
      expect(network).toMatchObject({ port, device });
    }
    expect((await settings.get(admin)).restartRequired).toBe(true);
    commands.up.mockRejectedValueOnce(new Error('Device unavailable'));
    await expect(vpn.restart()).rejects.toThrow('Device unavailable');
    expect((await settings.get(admin)).restartRequired).toBe(true);
    await vpn.maintain();
    expect((await settings.get(admin)).restartRequired).toBe(false);
    expect(commands.up.mock.lastCall?.[0]).toMatchObject({
      port: 51830,
      device: 'lo',
    });
  });

  test.each(['start', 'edit'])(
    'cleans up failed default policy at %s and retries on a fresh link before PostUp',
    async (operation) => {
      const { store, commands } = await vpnFixture();
      await store.hooks.update({ preUp: '', postUp: 'up' });
      const configure = vi.mocked(LinuxTunnel.prototype.configureLink);
      configure.mockResolvedValueOnce(
        createError({ status: 409, message: 'Default route conflict' })
      );
      const changes = { serverAllowedIps: ['::/0'] };
      if (operation === 'start') {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        await store.clients.update(1, changes);
        await vpn.start();
      } else {
        await expect(
          vpn.commit((tx) => tx.clients.update(1, changes))
        ).rejects.toMatchObject({ status: 409 });
      }
      expect(commands.down).toHaveBeenLastCalledWith('wg0', true);
      expect(commands.runHook).not.toHaveBeenCalled();
      await vpn.maintain();
      await vpn.maintain();
      expect(commands.up).toHaveBeenCalledTimes(2);
      expect(configure).toHaveBeenCalledTimes(2);
      expect(commands.runHook).toHaveBeenCalledExactlyOnceWith(
        'wg0',
        'auto',
        'up'
      );
    }
  );

  test('retries firewall setup after a restart without running PostUp again', async () => {
    const { commands, firewall } = await vpnFixture();
    firewall.rebuildRules.mockRejectedValueOnce(
      new Error('Firewall unavailable')
    );
    await expect(vpn.restart()).rejects.toThrow('Firewall unavailable');
    await vpn.maintain();
    expect(firewall.rebuildRules).toHaveBeenCalledTimes(2);
    expect(commands.up).toHaveBeenCalledOnce();
    expect(commands.runHook).toHaveBeenCalledOnce();
  });

  test('finishes a failed post-hook route check live after a cold start', async () => {
    const { commands } = await vpnFixture();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const sites = vi.spyOn(SiteRoutes.prototype, 'sync');
    sites
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Route read failed'));
    await vpn.start();
    expect(commands.runHook).toHaveBeenCalledOnce();
    await vpn.maintain();
    expect(sites).toHaveBeenCalledTimes(3);
    expect(commands.up).toHaveBeenCalledOnce();
    expect(commands.runHook).toHaveBeenCalledOnce();
  });

  test('retries only shutdown when cleanup after a failed PostUp also fails', async () => {
    const { commands } = await vpnFixture();
    commands.down
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('Shutdown failed'));
    commands.runHook.mockRejectedValueOnce(new Error('Hook failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(vpn.restart()).rejects.toMatchObject({ status: 503 });
    await expect(vpn.maintain()).rejects.toMatchObject({ status: 503 });
    await vpn.maintain();
    expect(commands.down).toHaveBeenCalledTimes(3);
    expect(commands.up).toHaveBeenCalledOnce();
    expect(commands.runHook).toHaveBeenCalledOnce();
  });

  test('retries a failed start without replacing the initialized server identity', async () => {
    const { store, commands } = await vpnFixture();
    commands.up.mockRejectedValueOnce(new Error('Device unavailable'));
    await expect(vpn.start()).rejects.toThrow('Device unavailable');
    expect((await settings.get(admin)).restartRequired).toBe(true);
    const initialized = await store.interfaces.get();
    expect(initialized).toMatchObject({
      privateKey: 'new-private',
      publicKey: 'new-public',
    });

    await vpn.maintain();

    expect((await settings.get(admin)).restartRequired).toBe(false);
    expect(commands.up).toHaveBeenCalledTimes(2);
    expect(commands.sync).toHaveBeenCalledOnce();
    expect(commands.generateKeyPair).toHaveBeenCalledOnce();
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
      if (offset < 0) {
        expect(link).toBeDefined();
      } else {
        expect(link).toBeUndefined();
      }
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
          if (expired) {
            await expect(enable()).rejects.toMatchObject({ status: 422 });
          } else {
            await enable();
          }
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
    expect(commands.up).toHaveBeenCalledOnce();
    expect(commands.up.mock.lastCall?.[0].publicKey).toBe('new-public');
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
