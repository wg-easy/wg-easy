import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  QuotaClientNotFoundError,
  QuotaService,
} from '#db/repositories/quota/service';
import { client, quota, user } from '#db/schema';
import * as schema from '#db/schema';
import type { DBType } from '#db/sqlite';
import { roles } from '#shared/utils/permissions';

describe('QuotaService', () => {
  let db: DBType;
  let service: QuotaService;
  let clientId: number;
  let userId: number;
  let databasePath: string;
  let rawClient: ReturnType<typeof createClient>;
  let queryLog: string[];

  beforeEach(async () => {
    databasePath = join(tmpdir(), `wg-easy-quota-${randomUUID()}.db`);
    rawClient = createClient({ url: `file:${databasePath}` });
    queryLog = [];
    db = drizzle({
      client: rawClient,
      schema,
      logger: {
        logQuery(query) {
          queryLog.push(query);
        },
      },
    }) as DBType;
    await migrate(db, { migrationsFolder: './server/database/migrations' });
    const [createdUser] = await db
      .insert(user)
      .values({
        username: 'quota-test',
        name: 'Quota test',
        role: roles.ADMIN,
        totpVerified: false,
        enabled: true,
      })
      .returning({ id: user.id });
    userId = createdUser!.id;
    const [createdClient] = await db
      .insert(client)
      .values({
        userId,
        interfaceId: 'wg0',
        name: 'Test client',
        ipv4Address: '10.8.0.2',
        ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:2',
        privateKey: 'private',
        publicKey: 'public',
        preSharedKey: 'shared',
        serverAllowedIps: [],
        persistentKeepalive: 0,
        mtu: 1420,
        enabled: true,
      })
      .returning({ id: client.id });
    clientId = createdClient!.id;
    service = new QuotaService(db);
  });

  afterEach(async () => {
    rawClient.close();
    await rm(databasePath, { force: true });
  });

  test('rejects a bulk assignment when any client does not exist', async () => {
    await expect(
      service.create({
        name: 'Invalid assignment',
        enabled: true,
        limit: { mode: 'TOTAL', totalBytes: 100 },
        reset: { frequency: 'NONE' },
        clientIds: [clientId, 999],
      })
    ).rejects.toBeInstanceOf(QuotaClientNotFoundError);

    expect(await db.select().from(quota)).toHaveLength(0);
  });

  test('distinguishes missing quotas and clients when assigning a quota', async () => {
    await expect(service.assignClient(clientId, 999)).resolves.toBe(
      'quota-not-found'
    );

    const quotaId = await service.create({
      name: 'Assignment target',
      enabled: true,
      limit: { mode: 'TOTAL', totalBytes: 100 },
      reset: { frequency: 'NONE' },
      clientIds: [],
    });

    await expect(service.assignClient(999, quotaId)).resolves.toBe(
      'client-not-found'
    );
    await expect(service.assignClient(clientId, quotaId)).resolves.toBe(
      'assigned'
    );
  });

  test('accounts counter deltas and reports a new exceeded state', async () => {
    const quotaId = await service.create({
      name: 'Shared quota',
      enabled: true,
      limit: { mode: 'TOTAL', totalBytes: 200 },
      reset: { frequency: 'NONE' },
      clientIds: [clientId],
    });
    await service.checkpointClientCounters([
      { publicKey: 'public', transferRx: 100, transferTx: 200 },
    ]);

    expect(
      await service.collectClientCounters([
        { publicKey: 'public', transferRx: 130, transferTx: 260 },
      ])
    ).toBe(false);
    expect(await service.get(quotaId)).toMatchObject({
      usedRxBytes: 30,
      usedTxBytes: 60,
      exceededAt: null,
    });

    expect(
      await service.collectClientCounters([
        { publicKey: 'public', transferRx: 160, transferTx: 400 },
      ])
    ).toBe(true);
    expect(await service.get(quotaId)).toMatchObject({
      usedRxBytes: 60,
      usedTxBytes: 200,
    });
    expect((await service.get(quotaId))?.exceededAt).not.toBeNull();
  });

  test('continues accounting while enforcement is disabled', async () => {
    const quotaId = await service.create({
      name: 'Accounting only',
      enabled: false,
      limit: { mode: 'RX', rxBytes: 1 },
      reset: { frequency: 'NONE' },
      clientIds: [clientId],
    });
    await service.checkpointClientCounters([
      { publicKey: 'public', transferRx: 10, transferTx: 20 },
    ]);
    expect(
      await service.collectClientCounters([
        { publicKey: 'public', transferRx: 20, transferTx: 40 },
      ])
    ).toBe(false);
    expect(await service.get(quotaId)).toMatchObject({
      usedRxBytes: 10,
      usedTxBytes: 20,
      exceededAt: null,
    });
  });

  test('batches counter writes while preserving aggregate usage', async () => {
    const additionalClients = await db
      .insert(client)
      .values(
        Array.from({ length: 1_000 }, (_, index) => ({
          userId,
          interfaceId: 'wg0',
          name: `Batch client ${index}`,
          ipv4Address: `10.9.${Math.floor(index / 250)}.${(index % 250) + 1}`,
          ipv6Address: `fd00::${(index + 1).toString(16)}`,
          privateKey: `private-${index}`,
          publicKey: `public-${index}`,
          preSharedKey: `shared-${index}`,
          serverAllowedIps: [],
          persistentKeepalive: 0,
          mtu: 1420,
          enabled: true,
        }))
      )
      .returning({ id: client.id, publicKey: client.publicKey });
    const assignedClients = [
      { id: clientId, publicKey: 'public' },
      ...additionalClients,
    ];
    const quotaId = await service.create({
      name: 'Large shared quota',
      enabled: true,
      limit: { mode: 'TOTAL', totalBytes: Number.MAX_SAFE_INTEGER },
      reset: { frequency: 'NONE' },
      clientIds: assignedClients.map((item) => item.id),
    });

    queryLog.length = 0;
    await service.checkpointClientCounters(
      assignedClients.map((item) => ({
        publicKey: item.publicKey,
        transferRx: 100,
        transferTx: 200,
      }))
    );
    const checkpointWrites = queryLog.filter((query) =>
      query.startsWith('insert into "quota_client_counters_table"')
    ).length;

    queryLog.length = 0;
    await expect(
      service.collectClientCounters(
        assignedClients.map((item) => ({
          publicKey: item.publicKey,
          transferRx: 130,
          transferTx: 260,
        }))
      )
    ).resolves.toBe(false);
    const collectionWrites = queryLog.filter((query) =>
      query.startsWith('insert into "quota_client_counters_table"')
    ).length;

    expect({ checkpointWrites, collectionWrites }).toEqual({
      checkpointWrites: 2,
      collectionWrites: 2,
    });
    expect(await service.get(quotaId)).toMatchObject({
      usedRxBytes: 30 * assignedClients.length,
      usedTxBytes: 60 * assignedClients.length,
      exceededAt: null,
    });
  });
});
