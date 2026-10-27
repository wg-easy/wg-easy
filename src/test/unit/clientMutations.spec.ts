import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { mockEvent } from 'h3';
import { beforeEach, describe, expect, onTestFinished, test, vi } from 'vitest';

import * as schema from '#db/schema';
import { HooksService } from '#db/repositories/hooks/service';
import { InterfaceService } from '#db/repositories/interface/service';
import WireGuard from '#server/utils/WireGuard';
import { UserConfigService } from '#db/repositories/userConfig/service';
import { ClientService } from '#db/repositories/client/service';
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

vi.mock('#server/utils/session', () => ({ getCurrentUser }));
vi.mock('#server/utils/config', () => ({
  OLD_ENV: {},
  WG_ENV: { WG_EXECUTABLE: 'wg', WG_INTERFACE: 'wg0', PORT: '51821' },
}));
vi.mock('#server/utils/cmd', () => ({ exec }));
vi.mock('#server/utils/Database', () => ({
  default: {
    get clients() {
      return clients;
    },
    get interfaces() {
      return new InterfaceService(db);
    },
    get hooks() {
      return new HooksService(db);
    },
    get userConfigs() {
      return new UserConfigService(db);
    },
  },
}));

const synchronize = WireGuard.saveConfig.bind(WireGuard);
const saveConfig = vi.spyOn(WireGuard, 'saveConfig');
const writeFile = vi.spyOn(fs, 'writeFile');

let clients: ClientService;
let db: ReturnType<typeof drizzle<typeof schema>>;

function request(action: string, clientIds: unknown[]) {
  return bulkAction(
    mockEvent('http://localhost/api/client/bulk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, clientIds }),
    })
  );
}

function clientEvent(clientId = 1, body?: unknown) {
  const event = mockEvent(`http://localhost/api/client/${clientId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  event.context.params = { clientId: String(clientId) };
  return event;
}

beforeEach(async () => {
  vi.resetAllMocks();
  saveConfig.mockImplementation(synchronize);
  writeFile.mockResolvedValue();
  exec.mockImplementation(async (command: string) => {
    if (command === 'wg genkey') return 'new-private-key';
    if (command === 'echo new-private-key | wg pubkey') return 'new-public-key';
    if (command === 'wg genpsk') return 'new-preshared-key';
    return '';
  });
  getCurrentUser.mockResolvedValue({ id: 1, role: 1 });
  const connection = createClient({ url: ':memory:' });
  onTestFinished(() => connection.close());
  db = drizzle({ client: connection, schema });
  const migrations = readMigrationFiles({
    migrationsFolder: fileURLToPath(
      new URL('../../server/database/migrations', import.meta.url)
    ),
  });
  await connection.migrate(migrations.flatMap((migration) => migration.sql));
  await connection.execute('PRAGMA foreign_keys = ON');
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
      ipv4Address: `10.8.0.${id}`,
      ipv6Address: `fd00::${id}`,
      privateKey: `private-${id}`,
      publicKey: `public-${id}`,
      serverAllowedIps: [],
      persistentKeepalive: 0,
      enabled: true,
    }))
  );
  clients = new ClientService(db);
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
      statusCode: 403,
    });
    expect(await clients.get(3)).toEqual(before);
    expect(writeFile).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });

  test('reports a missing client to an administrator without synchronizing', async () => {
    await expect(mutate(clientEvent(999))).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(writeFile).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });

  test('does not disclose a missing client to a non-owner', async () => {
    getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
    await expect(mutate(clientEvent(999))).rejects.toMatchObject({
      statusCode: 403,
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
      ).rejects.toMatchObject({ statusCode: 422 });
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
    expect(exec).not.toHaveBeenCalled();
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
    ).rejects.toMatchObject({ statusCode: 403 });
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
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(await clients.get(1)).toEqual(before);
    expect(writeFile).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });

  test('rejects settings for a missing client before synchronization', async () => {
    await expect(
      updateClient(clientEvent(999, await settings()))
    ).rejects.toMatchObject({ statusCode: 404 });
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
});

describe('bulk client API', () => {
  test('disables and enables only the selected clients, syncing once per batch', async () => {
    expect(await request('disable', [1, 2, 2])).toEqual({
      success: true,
      count: 2,
    });
    expect((await clients.get(1))?.enabled).toBe(false);
    expect((await clients.get(2))?.enabled).toBe(false);
    expect((await clients.get(3))?.enabled).toBe(true);
    expect(saveConfig).toHaveBeenCalledTimes(1);
    const savedConfig = String(writeFile.mock.calls[0]?.[1]);
    expect(savedConfig).not.toContain('PublicKey = public-1');
    expect(savedConfig).not.toContain('PublicKey = public-2');
    expect(savedConfig).toContain('PublicKey = public-3');
    expect(exec).toHaveBeenCalledWith('wg syncconf wg0 <(wg-quick strip wg0)');
    expect(await request('enable', [1, 2])).toEqual({
      success: true,
      count: 2,
    });
    expect((await clients.get(1))?.enabled).toBe(true);
    expect((await clients.get(2))?.enabled).toBe(true);
    expect(saveConfig).toHaveBeenCalledTimes(2);
    const enabledConfig = String(writeFile.mock.calls[1]?.[1]);
    expect(enabledConfig).toContain('PublicKey = public-1');
    expect(enabledConfig).toContain('PublicKey = public-2');
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
    expect(saveConfig).toHaveBeenCalledTimes(1);
  });

  test.each(['enable', 'disable', 'delete'])(
    'rejects the whole %s batch if any client belongs to another user',
    async (action) => {
      getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
      await clients.toggle(1, false);
      await expect(request(action, [1, 3])).rejects.toMatchObject({
        statusCode: 403,
      });
      expect((await clients.get(1))?.enabled).toBe(false);
      expect((await clients.get(3))?.enabled).toBe(true);
      expect(saveConfig).not.toHaveBeenCalled();
    }
  );

  test.each(['enable', 'disable', 'delete'])(
    'lets clients %s their own selections',
    async (action) => {
      getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
      expect(await request(action, [1, 2])).toEqual({
        success: true,
        count: 2,
      });
      expect(saveConfig).toHaveBeenCalledTimes(1);
    }
  );

  test('rejects missing clients before mutating any selected clients', async () => {
    await expect(request('delete', [1, 999])).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(await clients.get(1)).toBeDefined();
    expect(saveConfig).not.toHaveBeenCalled();
  });

  test('rejects the whole enable batch if any client is expired', async () => {
    await db.update(schema.client).set({ enabled: false });
    await db
      .update(schema.client)
      .set({ expiresAt: '2000-01-01' })
      .where(eq(schema.client.id, 2));
    await expect(request('enable', [1, 2])).rejects.toMatchObject({
      statusCode: 422,
    });
    expect((await clients.get(1))?.enabled).toBe(false);
    expect(saveConfig).not.toHaveBeenCalled();
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
    await expect(
      request(action as string, ids as unknown[])
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(await clients.get(1)).toBeDefined();
    expect(saveConfig).not.toHaveBeenCalled();
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
