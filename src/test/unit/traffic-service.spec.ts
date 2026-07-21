import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createClient } from '@libsql/client';
import { count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { TrafficService } from '#server/database/repositories/traffic/service';
import * as schema from '#server/database/schema';
import type { DBType } from '#db/sqlite';
import { roles } from '#shared/utils/permissions';

describe('TrafficService', () => {
  let libsql: ReturnType<typeof createClient>;
  let db: DBType;
  let traffic: TrafficService;
  let databasePath: string;

  beforeEach(async () => {
    databasePath = join(tmpdir(), `wg-easy-traffic-${randomUUID()}.db`);
    libsql = createClient({ url: `file:${databasePath}` });
    db = drizzle({ client: libsql, schema });
    await migrate(db, {
      migrationsFolder: './server/database/migrations',
    });
    traffic = new TrafficService(db);
  });

  afterEach(async () => {
    libsql.close();
    await rm(databasePath, { force: true });
  });

  async function createTestClient({
    dailyQuota = null,
    weeklyQuota = null,
    monthlyQuota = null,
  }: {
    dailyQuota?: number | null;
    weeklyQuota?: number | null;
    monthlyQuota?: number | null;
  } = {}) {
    const [testUser] = await db
      .insert(schema.user)
      .values({
        username: `test-${randomUUID()}`,
        password: null,
        name: 'Test User',
        role: roles.ADMIN,
        totpVerified: false,
        enabled: true,
      })
      .returning({ id: schema.user.id });
    const [testClient] = await db
      .insert(schema.client)
      .values({
        userId: testUser!.id,
        interfaceId: 'wg0',
        name: 'Test Client',
        ipv4Address: '10.8.0.2',
        ipv6Address: 'fdcc:ad94:bacf:61a3::2',
        privateKey: 'private-key',
        publicKey: 'public-key',
        preSharedKey: 'pre-shared-key',
        serverAllowedIps: [],
        persistentKeepalive: 0,
        mtu: 1420,
        enabled: true,
        dailyQuota,
        weeklyQuota,
        monthlyQuota,
      })
      .returning({ id: schema.client.id });

    return testClient!.id;
  }

  test('accumulates deltas, handles resets, and reports sparse days', async () => {
    const clientId = await createTestClient();

    await traffic.record(
      [{ publicKey: 'public-key', transferRx: 100, transferTx: 50 }],
      new Date('2026-06-22T12:00:00Z')
    );
    await traffic.record(
      [{ publicKey: 'public-key', transferRx: 140, transferTx: 70 }],
      new Date('2026-06-22T12:01:00Z')
    );
    await traffic.record(
      [{ publicKey: 'public-key', transferRx: 10, transferTx: 5 }],
      new Date('2026-06-23T00:01:00Z')
    );

    await expect(
      traffic.getReport(
        {
          id: clientId,
          dailyQuota: null,
          weeklyQuota: null,
          monthlyQuota: null,
        },
        { period: 'weekly', date: '2026-06-23' }
      )
    ).resolves.toMatchObject({
      receivedBytes: 150,
      sentBytes: 75,
      totalBytes: 225,
      days: [
        {
          date: '2026-06-22',
          receivedBytes: 140,
          sentBytes: 70,
          totalBytes: 210,
        },
        {
          date: '2026-06-23',
          receivedBytes: 10,
          sentBytes: 5,
          totalBytes: 15,
        },
      ],
    });
  });

  test('disables at the exact combined quota and cascades history', async () => {
    const clientId = await createTestClient({
      dailyQuota: 150,
      weeklyQuota: 1000,
    });

    await expect(
      traffic.record(
        [{ publicKey: 'public-key', transferRx: 100, transferTx: 50 }],
        new Date('2026-06-22T12:00:00Z')
      )
    ).resolves.toEqual([clientId]);

    const [client] = await db
      .select({ enabled: schema.client.enabled })
      .from(schema.client)
      .where(eq(schema.client.id, clientId));
    expect(client?.enabled).toBe(false);

    await db.delete(schema.client).where(eq(schema.client.id, clientId));
    const [usage] = await db
      .select({ count: count() })
      .from(schema.trafficUsage);
    const [state] = await db
      .select({ count: count() })
      .from(schema.trafficState);
    expect(usage?.count).toBe(0);
    expect(state?.count).toBe(0);
  });
});
