import fs from 'node:fs/promises';

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { requestEvent } from '../helpers/request';
import { databaseFixture } from '../helpers/database';

import * as schema from '#db/schema';
import { ClientRepository } from '#db/repositories/client/repository';
import bulkAction from '#server/api/client/bulk.post';
import createClientRoute from '#server/api/client/index.post';
import updateClient from '#server/api/client/[clientId]/index.post';
import enableClient from '#server/api/client/[clientId]/enable.post';
import disableClient from '#server/api/client/[clientId]/disable.post';
import deleteClient from '#server/api/client/[clientId]/index.delete';

const { getCurrentUser, exec } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  exec: vi.fn(),
}));

vi.mock('#server/features/identity/session', () => ({ getCurrentUser }));
vi.mock('#server/utils/config', () => ({
  OLD_ENV: {},
  WG_ENV: { WG_EXECUTABLE: 'wg', WG_INTERFACE: 'wg0', PORT: '51821' },
}));
vi.mock('#server/utils/cmd', () => ({ exec }));
vi.mock('#server/http/translation', () => ({
  useRequestTranslation: () => (key: string) => key,
}));
const writeFile = vi.spyOn(fs, 'writeFile');

let clients: ClientRepository;
let db: Awaited<ReturnType<typeof databaseFixture>>['db'];

function request(action: string, clientIds: unknown[]) {
  return bulkAction(
    requestEvent('http://localhost/api/client/bulk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, clientIds }),
    })
  );
}

function clientEvent(clientId = 1, body?: unknown) {
  const event = requestEvent(`http://localhost/api/client/${clientId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  event.context.params = { clientId: String(clientId) };
  return event;
}

beforeEach(async () => {
  vi.resetAllMocks();
  writeFile.mockResolvedValue();
  exec.mockImplementation(async (command: string) => {
    if (command === 'wg genkey') return 'new-private-key';
    if (command === 'echo new-private-key | wg pubkey') return 'new-public-key';
    if (command === 'wg genpsk') return 'new-preshared-key';
    return '';
  });
  getCurrentUser.mockResolvedValue({ id: 1, role: 1 });
  ({ db } = await databaseFixture());
  await db.insert(schema.user).values(
    [1, 2].map((id) => ({
      id,
      username: `user-${id}`,
      name: `User ${id}`,
      role: id,
      totpVerified: false,
      enabled: true,
    }))
  );
  await db.insert(schema.client).values(
    [1, 2, 3].map((id) => ({
      id,
      userId: id === 3 ? 1 : 2,
      interfaceId: 'wg0',
      name: `Client ${id}`,
      ipv4Address: `10.8.0.${id + 1}`,
      ipv6Address: `fd00::${id}`,
      privateKey: `private-${id}`,
      publicKey: `public-${id}`,
      serverAllowedIps: [],
      persistentKeepalive: 0,
      enabled: true,
    }))
  );
  clients = new ClientRepository(db);
});

describe.each([
  ['enable', enableClient],
  ['disable', disableClient],
  ['delete', deleteClient],
] as const)('individual client %s', (action, mutate) => {
  test('allows the owner and synchronizes the changed state', async () => {
    getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
    await db
      .update(schema.client)
      .set({ enabled: false })
      .where(eq(schema.client.id, 1));
    expect(await mutate(clientEvent())).toEqual({ success: true });
    const changed = await clients.get(1);
    if (action === 'delete') expect(changed).toBeUndefined();
    else expect(changed?.enabled).toBe(action === 'enable');
    expect((await clients.get(2))?.enabled).toBe(true);
    expect(writeFile).toHaveBeenCalledOnce();
    const config = String(writeFile.mock.calls[0]?.[1]);
    expect(config.includes('PublicKey = public-1')).toBe(action === 'enable');
    expect(exec).toHaveBeenCalledWith('wg syncconf wg0 <(wg-quick strip wg0)');
  });

  test('rejects another owner before changing or synchronizing anything', async () => {
    getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
    const before = await clients.get(3);
    await expect(mutate(clientEvent(3))).rejects.toMatchObject({
      status: 403,
    });
    expect(await clients.get(3)).toEqual(before);
    expect(writeFile).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });

  test('reports a missing client to an administrator without synchronizing', async () => {
    await expect(mutate(clientEvent(999))).rejects.toMatchObject({
      status: 404,
    });
    expect(writeFile).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });

  test('does not disclose a missing client to a non-owner', async () => {
    getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
    await expect(mutate(clientEvent(999))).rejects.toMatchObject({
      status: 403,
    });
    expect(writeFile).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });
});

describe('client mutation sequencing', () => {
  test.each(['single', 'bulk'] as const)(
    'rejects expired %s enables before any effects',
    async (mode) => {
      await db
        .update(schema.client)
        .set({ enabled: false, expiresAt: '2000-01-01' })
        .where(eq(schema.client.id, 1));
      await expect(
        mode === 'single' ? enableClient(clientEvent()) : request('enable', [1])
      ).rejects.toMatchObject({ status: 422 });
      expect((await clients.get(1))?.enabled).toBe(false);
      expect(writeFile).not.toHaveBeenCalled();
      expect(exec).not.toHaveBeenCalled();
    }
  );

  test('waits for synchronization before reporting success', async () => {
    let finishSync!: () => void;
    const syncing = new Promise<void>((resolve) => {
      finishSync = resolve;
    });
    exec.mockImplementation(async (command: string) => {
      if (command.includes(' syncconf ')) await syncing;
      return '';
    });
    let completed = false;
    const result = disableClient(clientEvent()).then((response) => {
      completed = true;
      return response;
    });
    try {
      await vi.waitFor(() =>
        expect(exec).toHaveBeenCalledWith(
          'wg syncconf wg0 <(wg-quick strip wg0)'
        )
      );
      expect((await clients.get(1))?.enabled).toBe(false);
      expect(writeFile).toHaveBeenCalledOnce();
      expect(completed).toBe(false);
      expect(
        exec.mock.calls.some(([command]) => command.startsWith('iptables '))
      ).toBe(false);
    } finally {
      finishSync();
      await result;
    }
    expect(await result).toEqual({ success: true });
    expect(
      exec.mock.calls.some(([command]) => command.startsWith('iptables '))
    ).toBe(true);
  });

  test('keeps the committed change when writing the configuration fails', async () => {
    writeFile.mockRejectedValueOnce(new Error('Disk full'));
    await expect(disableClient(clientEvent())).rejects.toThrow('Disk full');
    expect((await clients.get(1))?.enabled).toBe(false);
    expect(exec).not.toHaveBeenCalledWith(
      'wg syncconf wg0 <(wg-quick strip wg0)'
    );
  });

  test('reports firewall failures after saving and syncing the configuration', async () => {
    exec.mockImplementation(async (command: string) => {
      if (command.startsWith('iptables ')) throw new Error('Firewall failed');
      return '';
    });
    await expect(disableClient(clientEvent())).rejects.toThrow(
      'Firewall failed'
    );
    expect((await clients.get(1))?.enabled).toBe(false);
    expect(writeFile).toHaveBeenCalledOnce();
    expect(exec).toHaveBeenCalledWith('wg syncconf wg0 <(wg-quick strip wg0)');
  });
});

describe('client creation and settings', () => {
  test('creates a client and synchronizes its generated keys', async () => {
    const response = await createClientRoute(
      clientEvent(1, { name: 'New client', expiresAt: null })
    );
    expect(response).toEqual({ success: true, clientId: 4 });
    expect((await clients.get(4))?.publicKey).toBe('new-public-key');
    expect(String(writeFile.mock.calls[0]?.[1])).toContain(
      'PublicKey = new-public-key'
    );
    expect(writeFile).toHaveBeenCalledOnce();
  });

  test('rejects client creation by a non-administrator before generating keys', async () => {
    getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
    await expect(
      createClientRoute(clientEvent(1, { name: 'New client', expiresAt: null }))
    ).rejects.toMatchObject({ status: 403 });
    expect(await clients.get(4)).toBeUndefined();
    expect(exec).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  async function settings() {
    return {
      ...(await clients.get(1)),
      name: 'Renamed',
      ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:2',
    };
  }

  test('lets the owner edit settings without changing keys', async () => {
    getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
    expect(await updateClient(clientEvent(1, await settings()))).toEqual({
      success: true,
    });
    expect(await clients.get(1)).toMatchObject({
      name: 'Renamed',
      publicKey: 'public-1',
      privateKey: 'private-1',
    });
    expect(String(writeFile.mock.calls[0]?.[1])).toContain(
      '# Client: Renamed (1)'
    );
    expect(writeFile).toHaveBeenCalledOnce();
  });

  test('rejects unauthorized settings changes', async () => {
    getCurrentUser.mockResolvedValue({ id: 3, role: 2 });
    const before = await clients.get(1);
    await expect(
      updateClient(clientEvent(1, await settings()))
    ).rejects.toMatchObject({ status: 403 });
    expect(await clients.get(1)).toEqual(before);
    expect(writeFile).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });

  test('rejects settings for a missing client before synchronization', async () => {
    await expect(
      updateClient(clientEvent(999, await settings()))
    ).rejects.toMatchObject({ status: 404 });
    expect(writeFile).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });

  test('does not synchronize a rejected database change', async () => {
    const before = await clients.get(1);
    await expect(
      updateClient(
        clientEvent(1, { ...(await settings()), ipv4Address: '192.0.2.1' })
      )
    ).rejects.toThrow('IPv4 address is not within the CIDR range');
    expect(await clients.get(1)).toEqual(before);
    expect(writeFile).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });

  test.each([
    ['routes', { serverAllowedIps: ['10.0.0.1:443'] }],
    ['endpoint', { serverEndpoint: 'vpn.example.com' }],
  ] as const)(
    'invalid peer %s cannot change saved or running state',
    async (_field, invalid) => {
      const before = await clients.get(1);
      await expect(
        updateClient(clientEvent(1, { ...(await settings()), ...invalid }))
      ).rejects.toMatchObject({ status: 400 });
      expect(await clients.get(1)).toEqual(before);
      expect(writeFile).not.toHaveBeenCalled();
      expect(exec).not.toHaveBeenCalled();
    }
  );

  test.each(
    [[], ['192.0.2.0/24', '2001:db8::/64', '192.0.2.1']].map(
      (serverAllowedIps) => ({ serverAllowedIps })
    )
  )(
    'accepts optional valid server routes: $serverAllowedIps',
    async ({ serverAllowedIps }) => {
      await updateClient(
        clientEvent(1, { ...(await settings()), serverAllowedIps })
      );
      expect((await clients.get(1))?.serverAllowedIps).toEqual(
        serverAllowedIps
      );
    }
  );
});

describe('bulk client API', () => {
  describe.each(['enable', 'disable', 'delete'] as const)('%s', (action) => {
    test.each(
      [
        [1, 2],
        [2, 1],
        [1, 2, 2],
        [2, 1, 2, 1],
      ].map((ids) => ({ ids }))
    )(
      'changes only selected clients regardless of order or duplicates: $ids',
      async ({ ids }) => {
        getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
        await db.update(schema.client).set({ enabled: action !== 'enable' });
        const before = await clients.getAll();
        const selected = new Set(ids);
        const expected = before.flatMap((client) => {
          if (!selected.has(client.id)) return [client];
          if (action === 'delete') return [];
          return [
            {
              ...client,
              enabled: action === 'enable',
              updatedAt: expect.any(Date),
            },
          ];
        });

        expect(await request(action, ids)).toEqual({
          success: true,
          count: selected.size,
        });
        expect(await clients.getAll()).toEqual(expected);
        expect(writeFile).toHaveBeenCalledOnce();
        const configuration = String(writeFile.mock.lastCall?.[1]);
        const peerKeys = [
          ...configuration.matchAll(/^PublicKey = (.+)$/gm),
        ].map((match) => match[1]);
        expect(peerKeys.sort()).toEqual(
          expected
            .filter(({ enabled }) => enabled)
            .map(({ publicKey }) => publicKey)
            .sort()
        );
        expect(exec).toHaveBeenCalledWith(
          'wg syncconf wg0 <(wg-quick strip wg0)'
        );

        if (action !== 'delete') {
          await request(action, ids);
          expect(await clients.getAll()).toEqual(expected);
          expect(writeFile.mock.lastCall?.[1]).toBe(configuration);
        }
      }
    );
  });

  test('deletes selected clients and cascades their one-time links', async () => {
    await db.insert(schema.oneTimeLink).values({
      id: 1,
      oneTimeLink: 'test-link',
      expiresAt: '2099-01-01',
    });
    expect(await request('delete', [1, 2])).toEqual({
      success: true,
      count: 2,
    });
    expect(await clients.get(1)).toBeUndefined();
    expect(await clients.get(2)).toBeUndefined();
    expect(await clients.get(3)).toBeDefined();
    expect(await db.select().from(schema.oneTimeLink)).toEqual([]);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });

  test.each(['enable', 'disable', 'delete'])(
    'rejects the whole %s batch if any client belongs to another user',
    async (action) => {
      getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
      await clients.update(1, { enabled: false });
      const before = await clients.getAll();
      for (const ids of [
        [1, 3],
        [3, 1],
      ]) {
        await expect(request(action, ids)).rejects.toMatchObject({
          status: 403,
        });
        expect(await clients.getAll()).toEqual(before);
      }
      expect(writeFile).not.toHaveBeenCalled();
      expect(exec).not.toHaveBeenCalled();
    }
  );

  test.each(['enable', 'disable', 'delete'])(
    'rejects a missing client without changing any rows during %s',
    async (action) => {
      const before = await clients.getAll();
      for (const ids of [
        [1, 999],
        [999, 1],
      ]) {
        await expect(request(action, ids)).rejects.toMatchObject({
          status: 404,
        });
        expect(await clients.getAll()).toEqual(before);
      }
      expect(writeFile).not.toHaveBeenCalled();
      expect(exec).not.toHaveBeenCalled();
    }
  );

  test('rejects the whole enable batch if any client is expired', async () => {
    await db.update(schema.client).set({ enabled: false });
    await db
      .update(schema.client)
      .set({ expiresAt: '2000-01-01' })
      .where(eq(schema.client.id, 2));
    const before = await clients.getAll();
    for (const ids of [
      [1, 2],
      [2, 1],
    ]) {
      await expect(request('enable', ids)).rejects.toMatchObject({
        status: 422,
      });
      expect(await clients.getAll()).toEqual(before);
    }
    expect(writeFile).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
    expect(await request('disable', [1, 2])).toEqual({
      success: true,
      count: 2,
    });
  });

  test.each([
    ['delete', []],
    ['delete', [0]],
    ['disable', [1.5]],
    ['enable', ['1']],
    ['unknown', [1]],
    ['delete', Array.from({ length: 101 }, (_, i) => i + 1)],
  ])('rejects invalid batches (%s)', async (action, ids) => {
    const before = await clients.getAll();
    await expect(
      request(action as string, ids as unknown[])
    ).rejects.toMatchObject({ status: 400 });
    expect(await clients.getAll()).toEqual(before);
    expect(writeFile).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });

  test('reports synchronization failures instead of claiming success', async () => {
    exec.mockImplementation(async (command: string) => {
      if (command.includes(' syncconf ')) throw new Error('Sync failed');
      return '';
    });
    await expect(request('disable', [1, 2])).rejects.toThrow('Sync failed');
    expect((await clients.get(1))?.enabled).toBe(false);
    expect((await clients.get(2))?.enabled).toBe(false);
    expect(writeFile).toHaveBeenCalledOnce();
    expect(
      exec.mock.calls.some(([command]) => command.startsWith('iptables '))
    ).toBe(false);
  });
});
