import { describe, expect, onTestFinished, test } from 'vitest';

import { vpnFixture } from '../helpers/vpn';

import * as settings from '#server/features/vpn/interface';
import * as clients from '#server/features/vpn/clients';
import { download } from '#server/features/vpn/provisioning';
import { InterfaceUpdateSchema } from '#shared/contracts/interface';
import { UserConfigUpdateSchema } from '#shared/contracts/userConfig';
import { WG_ENV } from '#server/utils/config';
import { roles } from '#shared/utils/permissions';

const admin = { id: 1, role: roles.ADMIN };

async function settingsFixture() {
  const fixture = await vpnFixture();
  // Startup normally replaces the migration's uninitialized AWG headers.
  await fixture.store.interfaces.update({
    h1: '5',
    h2: '6',
    h3: '7',
    h4: '8',
  });
  return fixture;
}

describe('interface settings', () => {
  test('never returns the server private key or removes it from storage', async () => {
    const { store } = await settingsFixture();
    await store.interfaces.update({ privateKey: 'server-secret' });
    const before = await store.interfaces.get();

    expect(await settings.get(admin)).toEqual({
      ...before,
      privateKey: undefined,
    });
    expect(await store.interfaces.get()).toEqual(before);
  });

  test('denies non-admin changes before touching saved settings or the host', async () => {
    const { store, commands, firewall, writeConfiguration } =
      await settingsFixture();
    const network = await store.interfaces.get();
    const hooks = await store.hooks.get();
    const defaults = await store.userConfigs.get();
    const actor = { id: 1, role: roles.CLIENT };

    for (const operation of [
      () =>
        settings.update(
          actor,
          InterfaceUpdateSchema.parse({ ...network, firewallEnabled: true })
        ),
      () =>
        settings.updateCidr(actor, {
          ipv4Cidr: '192.0.2.0/24',
          ipv6Cidr: 'fd00::/64',
        }),
      () => settings.updateHooks(actor, { ...hooks, postUp: 'echo changed' }),
      () =>
        settings.updateDefaults(actor, {
          ...defaults,
          host: 'changed.example.com',
        }),
      () => settings.restart(actor),
    ]) {
      await expect(async () => operation()).rejects.toMatchObject({
        status: 403,
      });
    }

    expect(await store.interfaces.get()).toEqual(network);
    expect(await store.hooks.get()).toEqual(hooks);
    expect(await store.userConfigs.get()).toEqual(defaults);
    expect(firewall.isAvailable).not.toHaveBeenCalled();
    expect(firewall.blockTraffic).not.toHaveBeenCalled();
    expect(firewall.rebuildRules).not.toHaveBeenCalled();
    expect(writeConfiguration).not.toHaveBeenCalled();
    expect(commands.sync).not.toHaveBeenCalled();
    expect(commands.restart).not.toHaveBeenCalled();
  });

  test.each([false, true])(
    'rejects unavailable firewall tools without saving any changes (IPv6 disabled=%s)',
    async (disableIpv6) => {
      const { store, commands, firewall, writeConfiguration } =
        await settingsFixture();
      const previous = WG_ENV.DISABLE_IPV6;
      WG_ENV.DISABLE_IPV6 = disableIpv6;
      onTestFinished(() => {
        WG_ENV.DISABLE_IPV6 = previous;
      });
      await store.interfaces.update({ firewallEnabled: false });
      const before = await store.interfaces.get();
      firewall.isAvailable.mockResolvedValue(false);

      await expect(
        settings.update(
          admin,
          InterfaceUpdateSchema.parse({
            ...before,
            port: 51830,
            firewallEnabled: true,
          })
        )
      ).rejects.toMatchObject({ status: 400 });

      expect(firewall.isAvailable).toHaveBeenCalledWith(!disableIpv6);
      expect(await store.interfaces.get()).toEqual(before);
      expect(writeConfiguration).not.toHaveBeenCalled();
      expect(commands.sync).not.toHaveBeenCalled();
      expect(firewall.blockTraffic).not.toHaveBeenCalled();
      expect(firewall.rebuildRules).not.toHaveBeenCalled();
    }
  );

  test('applies an enabled firewall with the newly saved interface settings', async () => {
    const { store, commands, firewall, writeConfiguration } =
      await settingsFixture();
    const data = InterfaceUpdateSchema.parse({
      ...(await store.interfaces.get()),
      port: 51830,
      mtu: 1280,
      firewallEnabled: true,
    });

    await settings.update(admin, data);

    expect(await store.interfaces.get()).toMatchObject(data);
    expect(writeConfiguration.mock.lastCall?.[1]).toContain(
      'ListenPort = 51830\nMTU = 1280\n'
    );
    expect(commands.sync).toHaveBeenCalledWith('wg0');
    expect(firewall.rebuildRules.mock.lastCall?.[0]).toMatchObject(data);
  });

  test('can disable the firewall even when its tools are unavailable', async () => {
    const { store, firewall } = await settingsFixture();
    await store.interfaces.update({ firewallEnabled: true });
    firewall.isAvailable.mockResolvedValue(false);

    await settings.update(
      admin,
      InterfaceUpdateSchema.parse({
        ...(await store.interfaces.get()),
        firewallEnabled: false,
      })
    );

    expect((await store.interfaces.get()).firewallEnabled).toBe(false);
    expect(firewall.blockTraffic).not.toHaveBeenCalled();
    expect(firewall.rebuildRules.mock.lastCall?.[0].firewallEnabled).toBe(
      false
    );
  });

  test('applies saved hooks using the current interface values', async () => {
    const { store, writeConfiguration } = await settingsFixture();
    await store.interfaces.update({ port: 51830 });
    const hooks = {
      preUp: 'echo {{interface}}',
      postUp: 'echo {{port}}',
      preDown: '',
      postDown: 'echo stopped',
    };

    await settings.updateHooks(admin, hooks);

    expect(await settings.getHooks(admin)).toMatchObject(hooks);
    expect(writeConfiguration.mock.lastCall?.[1]).toContain(
      'PreUp = echo wg0\nPostUp = echo 51830\nPreDown = \nPostDown = echo stopped'
    );
  });

  test('new defaults affect new peers and inherited settings without overwriting existing peer settings', async () => {
    const { store, firewall } = await settingsFixture();
    await store.clients.update(1, {
      mtu: 1400,
      persistentKeepalive: 25,
      dns: ['192.0.2.53'],
      allowedIps: ['192.0.2.0/24'],
    });
    const existing = await store.clients.get(1);
    const defaults = UserConfigUpdateSchema.parse({
      ...(await store.userConfigs.get()),
      host: 'vpn.example.com',
      port: 51830,
      defaultMtu: 1280,
      defaultPersistentKeepalive: 15,
      defaultDns: ['198.51.100.53'],
      defaultAllowedIps: ['198.51.100.0/24'],
    });

    await settings.updateDefaults(admin, defaults);

    expect(await settings.getDefaults(admin)).toMatchObject(defaults);
    expect(await store.clients.get(1)).toEqual(existing);
    expect(firewall.rebuildRules.mock.lastCall?.[2]).toMatchObject(defaults);
    const createdId = await clients.create(admin, {
      name: 'New client',
      expiresAt: null,
    });
    for (const [id, lines] of [
      [
        1,
        [
          'MTU = 1400',
          'PersistentKeepalive = 25',
          'DNS = 192.0.2.53',
          'AllowedIPs = 192.0.2.0/24',
        ],
      ],
      [
        createdId,
        [
          'MTU = 1280',
          'PersistentKeepalive = 15',
          'DNS = 198.51.100.53',
          'AllowedIPs = 198.51.100.0/24',
        ],
      ],
    ] as const) {
      const { contents } = await download(admin, id);
      expect(contents.split('\n')).toEqual(
        expect.arrayContaining([...lines, 'Endpoint = vpn.example.com:51830'])
      );
    }
  });
});
