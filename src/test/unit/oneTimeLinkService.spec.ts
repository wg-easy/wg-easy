import { describe, expect, test, beforeEach } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { sql } from 'drizzle-orm';
import * as schema from '../../server/database/schema';
import { OneTimeLinkService } from '../../server/database/repositories/oneTimeLink/service';
import { oneTimeLink as otlTable } from '../../server/database/repositories/oneTimeLink/schema';

async function createTestDb() {
  const client = createClient({ url: ':memory:' });
  const db = drizzle({ client, schema });
  // SQLite does not enforce FK constraints by default, so we only need this table.
  await db.run(sql`
    CREATE TABLE one_time_links_table (
      id          INTEGER PRIMARY KEY,
      one_time_link TEXT NOT NULL UNIQUE,
      expires_at  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `);
  return db;
}

describe('OneTimeLinkService upsert', () => {
  let service: OneTimeLinkService;
  let db: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    db = await createTestDb();
    service = new OneTimeLinkService(db);
  });

  test('generates and stores a token for a new client', async () => {
    await service.generate(1);
    const rows = await db.select().from(otlTable);
    expect(rows).toHaveLength(1);
    expect(rows[0].oneTimeLink).toMatch(/^[0-9a-f]{64}$/);
  });

  test('regenerating for the same client updates both token and expiry', async () => {
    await service.generate(1);
    const [first] = await db.select().from(otlTable);

    // Small delay so the expiry timestamps are observably different.
    await new Promise((r) => setTimeout(r, 5));

    await service.generate(1);
    const rows = await db.select().from(otlTable);

    // Still exactly one row — no duplicate inserted.
    expect(rows).toHaveLength(1);

    const [second] = rows;
    expect(second.oneTimeLink).not.toBe(first.oneTimeLink);
    expect(second.expiresAt > first.expiresAt).toBe(true);
  });
});
