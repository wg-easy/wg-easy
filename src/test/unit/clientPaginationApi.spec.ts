import { fileURLToPath } from 'node:url';

import { createClient } from '@libsql/client';
import { eq, gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { mockEvent } from 'h3';
import { beforeEach, describe, expect, onTestFinished, test, vi } from 'vitest';

import * as schema from '#db/schema';
import { ClientService } from '#db/repositories/client/service';
import {
  ClientCreateSchema,
  ClientQuerySchema,
  ClientUpdateSchema,
} from '#db/repositories/client/types';
import listClients from '#server/api/client/index.get';
import enableClient from '#server/api/client/[clientId]/enable.post';
import WireGuard from '#server/utils/WireGuard';

const { getCurrentUser, dump } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  dump: vi.fn(),
}));

vi.mock('#server/utils/session', () => ({ getCurrentUser }));
vi.mock('#server/utils/wgHelper', () => ({ wg: { dump } }));
vi.mock('#server/utils/config', () => ({
  OLD_ENV: {},
  WG_ENV: { WG_EXECUTABLE: 'wg', WG_INTERFACE: 'wg0', PORT: '51821' },
}));
vi.mock('#server/utils/Database', () => ({
  default: {
    get clients() {
      return clients;
    },
    interfaces: { get: async () => ({ name: 'wg0' }) },
  },
}));

let clients: ClientService;
let db: ReturnType<typeof drizzle<typeof schema>>;
const logQuery = vi.fn();

function request(query = '') {
  return listClients(mockEvent(`http://localhost/api/client${query}`));
}

beforeEach(async () => {
  vi.resetAllMocks();
  getCurrentUser.mockResolvedValue({ id: 1, role: 1 });
  dump.mockResolvedValue([]);

  const connection = createClient({ url: ':memory:' });
  onTestFinished(() => connection.close());
  db = drizzle({ client: connection, schema, logger: { logQuery } });
  const migrations = readMigrationFiles({
    migrationsFolder: fileURLToPath(
      new URL('../../server/database/migrations', import.meta.url)
    ),
  });
  await connection.migrate(migrations.flatMap((migration) => migration.sql));
  await db.insert(schema.user).values(
    [1, 2, 3].map((id) => ({
      id,
      username: `user-${id}`,
      name: `User ${id}`,
      role: id === 1 ? 1 : 2,
      totpVerified: false,
      enabled: true,
    }))
  );
  await db.insert(schema.client).values(
    Array.from({ length: 60 }, (_, index) => {
      const id = index + 1;
      return {
        id,
        userId: id <= 35 ? 2 : 1,
        interfaceId: 'wg0',
        name: `Client ${String(id).padStart(3, '0')}`,
        ipv4Address: `10.8.0.${id + 1}`,
        ipv6Address: `fd00::${id}`,
        privateKey: `private-${id}`,
        publicKey: `public-${id}`,
        preSharedKey: `preshared-${id}`,
        serverAllowedIps: [],
        persistentKeepalive: 0,
        enabled: true,
      };
    })
  );
  clients = new ClientService(db);
  logQuery.mockClear();
});

describe('paginated client API', () => {
  test('defaults to 25 clients and includes the total without exposing secrets', async () => {
    const result = await request();
    expect(result).toMatchObject({ page: 1, pageSize: 25, total: 60 });
    expect(result.clients).toHaveLength(25);
    expect(result.clients[0]?.id).toBe(1);
    expect(result.clients.at(-1)?.id).toBe(25);
    for (const client of result.clients) {
      expect(client).not.toHaveProperty('privateKey');
      expect(client).not.toHaveProperty('preSharedKey');
    }
  });

  test('uses SQL limit and offset for subsequent pages and merges their live status', async () => {
    const handshake = new Date('2026-10-26T10:00:00Z');
    dump.mockResolvedValue([
      {
        publicKey: 'public-26',
        latestHandshakeAt: handshake,
        endpoint: '192.0.2.1:51820',
        transferRx: 123,
        transferTx: 456,
      },
    ]);
    const result = await request('?page=2');
    expect(result).toMatchObject({ page: 2, pageSize: 25, total: 60 });
    expect(result.clients).toHaveLength(25);
    expect(result.clients[0]).toMatchObject({
      id: 26,
      latestHandshakeAt: handshake,
      transferRx: 123,
      transferTx: 456,
    });
    expect(result.clients.at(-1)?.id).toBe(50);
    expect(logQuery.mock.calls).toEqual(
      expect.arrayContaining([
        [
          expect.stringContaining('limit ? offset ?'),
          expect.arrayContaining([25]),
        ],
      ])
    );
    expect((await request('?page=3')).clients).toHaveLength(10);
  });

  test('applies ownership to both rows and counts before pagination', async () => {
    getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
    const result = await request('?page=2');
    expect(result).toMatchObject({ page: 2, total: 35 });
    expect(result.clients).toHaveLength(10);
    expect(result.clients.every((client) => client.userId === 2)).toBe(true);
    expect(result.clients.map(({ id }) => id)).toEqual([
      26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
    ]);

    const hidden = await request('?filter=Client%20060');
    expect(hidden).toMatchObject({ clients: [], total: 0, page: 1 });
    getCurrentUser.mockResolvedValue({ id: 3, role: 2 });
    expect(await request('?page=5')).toMatchObject({
      clients: [],
      total: 0,
      page: 1,
    });
  });

  test('filters and sorts the full matching set before applying the page boundary', async () => {
    const result = await request(
      '?filter=client%200&sort=desc&page=2&pageSize=10'
    );
    expect(result).toMatchObject({ total: 60, page: 2, pageSize: 10 });
    expect(result.clients.map(({ id }) => id)).toEqual([
      50, 49, 48, 47, 46, 45, 44, 43, 42, 41,
    ]);
    const filtered = await request('?filter=Client%2003&pageSize=5&page=2');
    expect(filtered).toMatchObject({ total: 10, page: 2, pageSize: 5 });
    expect(filtered.clients.map(({ id }) => id)).toEqual([35, 36, 37, 38, 39]);
  });

  test.each(['10.8.0.61', 'fd00::60'])(
    'finds clients by address %s across the full list',
    async (address) => {
      const result = await request(`?filter=${encodeURIComponent(address)}`);
      expect(result.total).toBe(1);
      expect(result.clients.map(({ id }) => id)).toEqual([60]);
    }
  );

  test.each(['asc', 'desc'])(
    'uses a stable ID tiebreaker for duplicate names in %s order',
    async (sort) => {
      await db.update(schema.client).set({ name: 'Same name' });
      const results = [];
      for (const page of [1, 2, 3]) {
        results.push(
          ...(await request(`?page=${page}&sort=${sort}`)).clients.map(
            ({ id }) => id
          )
        );
      }
      const ids = Array.from({ length: 60 }, (_, index) => index + 1);
      expect(results).toEqual(sort === 'desc' ? ids.reverse() : ids);
    }
  );

  test('clamps a deleted last page and returns an empty first page when no clients remain', async () => {
    await db.delete(schema.client).where(gt(schema.client.id, 50));
    const result = await request('?page=3');
    expect(result).toMatchObject({ page: 2, total: 50 });
    expect(result.clients).toHaveLength(25);
    await db.delete(schema.client);
    expect(await request('?page=3')).toEqual({
      clients: [],
      total: 0,
      page: 1,
      pageSize: 25,
    });
  });

  test('combines status, expiry, search, and ownership before counting and paging', async () => {
    getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
    await db
      .update(schema.client)
      .set({ enabled: false })
      .where(gt(schema.client.id, 20));
    const result = await request(
      '?status=disabled&expiry=permanent&filter=Client%200&pageSize=10&page=2'
    );
    expect(result).toMatchObject({ total: 15, page: 2 });
    expect(result.clients.map(({ id }) => id)).toEqual([31, 32, 33, 34, 35]);
    expect((await request('?status=enabled')).total).toBe(20);
  });

  test('filters online and offline clients using live handshakes and excludes disabled peers', async () => {
    const now = Date.now();
    dump.mockResolvedValue([
      { publicKey: 'public-1', latestHandshakeAt: new Date(now - 1000) },
      { publicKey: 'public-26', latestHandshakeAt: new Date(now - 1000) },
      { publicKey: 'public-27', latestHandshakeAt: new Date(now - 600_000) },
      { publicKey: 'public-28', latestHandshakeAt: null },
      { publicKey: 'public-60', latestHandshakeAt: new Date(now - 1000) },
    ]);
    await db
      .update(schema.client)
      .set({ enabled: false })
      .where(eq(schema.client.id, 1));
    getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
    const online = await request('?status=online&pageSize=1&page=5');
    expect(online).toMatchObject({ total: 1, page: 1 });
    expect(online.clients.map(({ id }) => id)).toEqual([26]);
    const offline = await request('?status=offline&pageSize=100');
    expect(offline.total).toBe(33);
    expect(offline.clients.map(({ id }) => id)).not.toContain(1);
    expect(offline.clients.map(({ id }) => id)).not.toContain(26);
    expect(offline.clients.map(({ id }) => id)).toEqual(
      expect.arrayContaining([27, 28])
    );
    dump.mockResolvedValue([]);
    expect((await request('?status=online')).total).toBe(0);
    expect((await request('?status=offline')).total).toBe(34);
  });

  test('handles expiry boundaries and timezone offsets', async () => {
    const now = new Date('2026-10-27T12:00:00Z').getTime();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    onTestFinished(() => clock.mockRestore());
    for (const [id, expiresAt] of [
      [1, '2026-10-27T13:00:00+02:00'],
      [2, '2026-10-27T12:00:00Z'],
      [3, '2026-10-27T12:00:01Z'],
      [4, '2026-11-03T12:00:00Z'],
      [5, '2026-11-03T12:00:01Z'],
      [6, '2026-10-27'],
      [7, '2026-10-28'],
    ] as const) {
      await db
        .update(schema.client)
        .set({ expiresAt })
        .where(eq(schema.client.id, id));
    }
    expect(
      (await request('?expiry=expired')).clients.map(({ id }) => id)
    ).toEqual([1, 2, 6]);
    expect(
      (await request('?expiry=expiring')).clients.map(({ id }) => id)
    ).toEqual([3, 4, 7]);
    expect((await request('?expiry=permanent')).total).toBe(53);
  });

  test.each(['2026-10-27', '2026-10-27T14:35:00.000Z', null])(
    'accepts and preserves expiry %s when saving a client',
    async (expiresAt) => {
      expect(
        ClientCreateSchema.parse({ name: 'Test client', expiresAt }).expiresAt
      ).toBe(expiresAt);
      const client = await clients.get(1);
      await clients.update(
        1,
        ClientUpdateSchema.parse({
          ...client,
          expiresAt,
          ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:2',
        })
      );
      expect((await clients.getPublic(1))?.expiresAt).toBe(expiresAt);
    }
  );

  test.each([
    ['2026-10-27', '2026-10-27T00:00:00.000Z'],
    ['2026-10-27T14:35:00.000Z', '2026-10-27T14:35:00.000Z'],
  ])('enforces expiry %s at the same instant', async (expiresAt, instant) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const saveConfig = vi.spyOn(WireGuard, 'saveConfig').mockResolvedValue();
    onTestFinished(() => {
      vi.useRealTimers();
      saveConfig.mockRestore();
    });
    await db
      .update(schema.client)
      .set({ expiresAt })
      .where(eq(schema.client.id, 1));

    vi.setSystemTime(new Date(instant).getTime() - 1000);
    await WireGuard.cronJob();
    expect((await clients.get(1))?.enabled).toBe(true);
    expect(saveConfig).not.toHaveBeenCalled();

    const event = mockEvent('http://localhost/api/client/1/enable');
    event.context.params = { clientId: '1' };
    expect(await enableClient(event)).toEqual({ success: true });
    saveConfig.mockClear();

    vi.setSystemTime(new Date(instant).getTime() + 1000);
    await WireGuard.cronJob();
    expect((await clients.get(1))?.enabled).toBe(false);
    expect((await clients.get(2))?.enabled).toBe(true);
    expect(saveConfig).toHaveBeenCalledOnce();
    await expect(enableClient(event)).rejects.toMatchObject({
      statusCode: 422,
    });
    expect((await clients.get(1))?.enabled).toBe(false);
  });

  test.each(['asc', 'desc'])(
    'sorts numeric IPv4 addresses across page boundaries in %s order',
    async (sort) => {
      // Cross an octet boundary as well as .9 / .10.
      await db
        .update(schema.client)
        .set({ ipv4Address: '10.8.1.1' })
        .where(eq(schema.client.id, 1));
      const result = await request(
        `?sortBy=ipv4Address&sort=${sort}&pageSize=10&page=2`
      );
      expect(result.clients.map(({ id }) => id)).toEqual(
        sort === 'asc'
          ? [12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
          : [51, 50, 49, 48, 47, 46, 45, 44, 43, 42]
      );
    }
  );

  test('sorts creation dates chronologically with stable ties', async () => {
    await db.update(schema.client).set({ createdAt: '2026-10-27 10:00:00' });
    await db
      .update(schema.client)
      .set({ createdAt: '2026-10-27T09:00:00Z' })
      .where(eq(schema.client.id, 60));
    await db
      .update(schema.client)
      .set({ createdAt: '2026-10-27T12:00:00Z' })
      .where(eq(schema.client.id, 1));
    expect(
      (await request('?sortBy=createdAt&sort=desc&pageSize=3')).clients.map(
        ({ id }) => id
      )
    ).toEqual([1, 59, 58]);
    expect(
      (await request('?sortBy=createdAt&sort=asc&pageSize=3')).clients.map(
        ({ id }) => id
      )
    ).toEqual([60, 2, 3]);
  });

  test.each(['asc', 'desc'])(
    'keeps permanent clients last when sorting expiry %s',
    async (sort) => {
      await db
        .update(schema.client)
        .set({ expiresAt: '2026-11-01T00:00:00Z' })
        .where(eq(schema.client.id, 40));
      await db
        .update(schema.client)
        .set({ expiresAt: '2026-12-01T00:00:00Z' })
        .where(eq(schema.client.id, 50));
      const result = await request(
        `?sortBy=expiresAt&sort=${sort}&pageSize=100`
      );
      expect(result.clients.slice(0, 2).map(({ id }) => id)).toEqual(
        sort === 'asc' ? [40, 50] : [50, 40]
      );
      expect(
        result.clients.slice(2).every(({ expiresAt }) => expiresAt === null)
      ).toBe(true);
    }
  );

  test('preserves one-time links on paginated clients and unpaginated metrics', async () => {
    await db.insert(schema.oneTimeLink).values({
      id: 26,
      oneTimeLink: 'test-link',
      expiresAt: '2099-01-01T00:00:00.000Z',
    });
    expect((await request('?page=2')).clients[0]?.oneTimeLink).toMatchObject({
      oneTimeLink: 'test-link',
    });
    const allClients = await WireGuard.getAllClients();
    expect(allClients).toHaveLength(60);
    expect(allClients.find(({ id }) => id === 26)?.oneTimeLink).toMatchObject({
      oneTimeLink: 'test-link',
    });
    expect(allClients.map(({ name }) => name)).toEqual(
      allClients.map(({ name }) => name).sort()
    );
    for (const client of allClients) {
      expect(client).not.toHaveProperty('privateKey');
      expect(client).not.toHaveProperty('preSharedKey');
    }
  });
});

describe('client pagination query validation', () => {
  test('accepts numeric query strings and defaults to 25', () => {
    expect(ClientQuerySchema.parse({})).toEqual({ page: 1, pageSize: 25 });
    expect(ClientQuerySchema.parse({ page: '2', pageSize: '100' })).toEqual({
      page: 2,
      pageSize: 100,
    });
  });

  test.each([
    { page: '0' },
    { page: '-1' },
    { page: '1.5' },
    { page: 'invalid' },
    { pageSize: '0' },
    { pageSize: '-1' },
    { pageSize: '1.5' },
    { pageSize: '101' },
    { pageSize: 'Infinity' },
    { status: 'unknown' },
    { expiry: 'unknown' },
    { sortBy: 'privateKey' },
    { sort: 'unknown' },
  ])('rejects invalid pagination %j', (query) => {
    expect(ClientQuerySchema.safeParse(query).success).toBe(false);
  });
});
