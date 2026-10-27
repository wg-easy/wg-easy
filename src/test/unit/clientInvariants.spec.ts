import { describe, expect, test } from 'vitest';

import { vpnFixture } from '../helpers/vpn';

import * as clients from '#server/features/vpn/clients';
import * as settings from '#server/features/vpn/interface';
import { roles } from '#shared/utils/permissions';
import { ClientUpdateSchema } from '#shared/contracts/client';

const admin = { id: 1, role: roles.ADMIN };

describe('client access and addresses', () => {
  test('rejects expired edits and creation without saving or applying them', async () => {
    const { store, writeConfiguration } = await vpnFixture();
    await store.clients.update(1, { enabled: false, expiresAt: '2000-01-01' });
    const before = await store.clients.get(1);
    await expect(
      clients.update(
        admin,
        1,
        ClientUpdateSchema.parse({ ...before, enabled: true })
      )
    ).rejects.toMatchObject({ statusCode: 422 });
    await expect(
      clients.create(admin, { name: 'Expired', expiresAt: '2000-01-01' })
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(await store.clients.get(1)).toEqual(before);
    expect(await store.clients.getAll()).toHaveLength(1);
    expect(writeConfiguration).not.toHaveBeenCalled();
  });

  test.each([null, '2099-01-01'])(
    'allows expiration to be corrected while enabling (%s)',
    async (expiresAt) => {
      const { store } = await vpnFixture();
      await store.clients.update(1, {
        enabled: false,
        expiresAt: '2000-01-01',
      });
      await clients.update(
        admin,
        1,
        ClientUpdateSchema.parse({
          ...(await store.clients.get(1)),
          enabled: true,
          expiresAt,
        })
      );
      expect(await store.clients.get(1)).toMatchObject({
        enabled: true,
        expiresAt,
      });
    }
  );

  test('allows editing a disabled expired client', async () => {
    const { store } = await vpnFixture();
    await clients.update(
      admin,
      1,
      ClientUpdateSchema.parse({
        ...(await store.clients.get(1)),
        enabled: false,
        expiresAt: '2000-01-01',
        name: 'Archived',
      })
    );
    expect(await store.clients.get(1)).toMatchObject({
      enabled: false,
      name: 'Archived',
    });
  });

  test.each([
    ['ipv4Address', '10.8.0.0'],
    ['ipv4Address', '10.8.0.1'],
    ['ipv4Address', '10.8.0.255'],
    ['ipv6Address', 'fdcc:ad94:bacf:61a4:0:0:cafe:1'],
  ])('rejects reserved address %s=%s', async (field, address) => {
    const { store, writeConfiguration } = await vpnFixture();
    const before = await store.clients.get(1);
    await expect(
      clients.update(
        admin,
        1,
        ClientUpdateSchema.parse({ ...before, [field]: address })
      )
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(await store.clients.get(1)).toEqual(before);
    expect(writeConfiguration).not.toHaveBeenCalled();
  });

  test('normalizes edits and checks duplicates against legacy IPv6 spelling', async () => {
    const { store, writeConfiguration } = await vpnFixture();
    await store.clients.update(1, {
      ipv6Address: 'FDCC:AD94:BACF:61A4:0:0:CAFE:2',
    });
    const id = await clients.create(admin, { name: 'Second', expiresAt: null });
    expect((await store.clients.get(id))?.ipv6Address).toBe(
      'fdcc:ad94:bacf:61a4::cafe:3'
    );
    writeConfiguration.mockClear();
    await expect(
      clients.update(
        admin,
        id,
        ClientUpdateSchema.parse({
          ...(await store.clients.get(id)),
          ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:2',
        })
      )
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(writeConfiguration).not.toHaveBeenCalled();
    await clients.update(
      admin,
      1,
      ClientUpdateSchema.parse(await store.clients.get(1))
    );
    expect((await store.clients.get(1))?.ipv6Address).toBe(
      'fdcc:ad94:bacf:61a4::cafe:2'
    );
  });

  test('serializes competing address assignments', async () => {
    const { store } = await vpnFixture();
    const id = await clients.create(admin, { name: 'Second', expiresAt: null });
    const results = await Promise.allSettled(
      [1, id].map(async (clientId) =>
        clients.update(
          admin,
          clientId,
          ClientUpdateSchema.parse({
            ...(await store.clients.get(clientId)),
            ipv4Address: '10.8.0.10',
          })
        )
      )
    );
    expect(
      results.filter((result) => result.status === 'fulfilled')
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected')
    ).toMatchObject([{ reason: { statusCode: 409 } }]);
  });
});

describe('CIDR changes', () => {
  test('shrinks a fully occupied address pool without needing an extra address', async () => {
    const { store } = await vpnFixture();
    const network = await store.interfaces.get();
    await settings.updateCidr(admin, {
      ipv4Cidr: '10.8.0.0/30',
      ipv6Cidr: network.ipv6Cidr,
    });
    expect((await store.clients.get(1))?.ipv4Address).toBe('10.8.0.2');
    expect((await store.interfaces.get()).ipv4Cidr).toBe('10.8.0.0/30');
  });

  test('reassigns out-of-range peers while preserving addresses that still fit', async () => {
    const { store, commands } = await vpnFixture();
    await store.clients.update(1, { ipv4Address: '10.8.0.200' });
    const id = await clients.create(admin, { name: 'Second', expiresAt: null });
    commands.getPublicKey.mockResolvedValueOnce('third-public');
    const third = await clients.create(admin, {
      name: 'Third',
      expiresAt: null,
    });
    const ipv6Cidr = (await store.interfaces.get()).ipv6Cidr;
    await settings.updateCidr(admin, { ipv4Cidr: '10.8.0.0/29', ipv6Cidr });
    expect((await store.clients.get(id))?.ipv4Address).toBe('10.8.0.2');
    expect((await store.clients.get(third))?.ipv4Address).toBe('10.8.0.3');
    expect((await store.clients.get(1))?.ipv4Address).toBe('10.8.0.4');
  });

  test('reassigns IPv6 addresses reserved by a narrower network', async () => {
    const { store } = await vpnFixture();
    await store.clients.update(1, {
      ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:5',
    });
    await settings.updateCidr(admin, {
      ipv4Cidr: '10.8.0.0/24',
      ipv6Cidr: 'fdcc:ad94:bacf:61a4::cafe:4/126',
    });
    expect((await store.clients.get(1))?.ipv6Address).toBe(
      'fdcc:ad94:bacf:61a4::cafe:6'
    );
  });
});
