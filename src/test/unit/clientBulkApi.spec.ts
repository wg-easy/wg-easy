import { fileURLToPath } from 'node:url';

import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { mockEvent } from 'h3';
import { beforeEach, describe, expect, onTestFinished, test, vi } from 'vitest';

import * as schema from '#db/schema';
import { ClientService } from '#db/repositories/client/service';
import bulkAction from '#server/api/client/bulk.post';

const { getCurrentUser, saveConfig } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  saveConfig: vi.fn(),
}));

vi.mock('#server/utils/session', () => ({ getCurrentUser }));
vi.mock('#server/utils/WireGuard', () => ({ default: { saveConfig } }));
vi.mock('#server/utils/config', () => ({ WG_ENV: { WG_INTERFACE: 'wg0' } }));
vi.mock('#server/utils/Database', () => ({
  default: {
    get clients() {
      return clients;
    },
  },
}));

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

beforeEach(async () => {
  vi.resetAllMocks();
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
    expect(await request('enable', [1, 2])).toEqual({
      success: true,
      count: 2,
    });
    expect((await clients.get(1))?.enabled).toBe(true);
    expect((await clients.get(2))?.enabled).toBe(true);
    expect(saveConfig).toHaveBeenCalledTimes(2);
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
    saveConfig.mockRejectedValueOnce(new Error('Sync failed'));
    await expect(request('disable', [1, 2])).rejects.toThrow('Sync failed');
  });
});
