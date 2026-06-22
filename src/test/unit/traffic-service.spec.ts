import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { TrafficService } from '#server/database/repositories/traffic/service';
import * as schema from '#server/database/schema';

describe('TrafficService', () => {
  let libsql: ReturnType<typeof createClient>;
  let traffic: TrafficService;
  let databasePath: string;

  beforeEach(async () => {
    databasePath = join(tmpdir(), `wg-easy-traffic-${randomUUID()}.db`);
    libsql = createClient({ url: `file:${databasePath}` });
    await libsql.executeMultiple(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE clients_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        public_key TEXT NOT NULL,
        enabled INTEGER NOT NULL,
        daily_quota INTEGER,
        weekly_quota INTEGER,
        monthly_quota INTEGER,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE TABLE client_traffic_state_table (
        client_id INTEGER PRIMARY KEY NOT NULL,
        transfer_rx INTEGER DEFAULT 0 NOT NULL,
        transfer_tx INTEGER DEFAULT 0 NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients_table(id) ON UPDATE CASCADE ON DELETE CASCADE
      );
      CREATE TABLE client_traffic_usage_table (
        client_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        received_bytes INTEGER DEFAULT 0 NOT NULL,
        sent_bytes INTEGER DEFAULT 0 NOT NULL,
        PRIMARY KEY (client_id, date),
        FOREIGN KEY (client_id) REFERENCES clients_table(id) ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    const db = drizzle({ client: libsql, schema });
    traffic = new TrafficService(db);
  });

  afterEach(async () => {
    libsql.close();
    await rm(databasePath, { force: true });
  });

  test('accumulates deltas, handles resets, and reports sparse days', async () => {
    await libsql.execute({
      sql: `INSERT INTO clients_table
        (id, public_key, enabled, daily_quota, weekly_quota, monthly_quota)
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: [1, 'public-key', 1, null, null, null],
    });

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
          id: 1,
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
    await libsql.execute({
      sql: `INSERT INTO clients_table
        (id, public_key, enabled, daily_quota, weekly_quota, monthly_quota)
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: [1, 'public-key', 1, 150, 1000, null],
    });

    await expect(
      traffic.record(
        [{ publicKey: 'public-key', transferRx: 100, transferTx: 50 }],
        new Date('2026-06-22T12:00:00Z')
      )
    ).resolves.toEqual([1]);

    const client = await libsql.execute(
      'SELECT enabled FROM clients_table WHERE id = 1'
    );
    expect(client.rows[0]?.enabled).toBe(0);

    await libsql.execute('DELETE FROM clients_table WHERE id = 1');
    const usage = await libsql.execute(
      'SELECT COUNT(*) AS count FROM client_traffic_usage_table'
    );
    const state = await libsql.execute(
      'SELECT COUNT(*) AS count FROM client_traffic_state_table'
    );
    expect(usage.rows[0]?.count).toBe(0);
    expect(state.rows[0]?.count).toBe(0);
  });
});
