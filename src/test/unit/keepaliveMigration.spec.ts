import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterAll, expect, test } from 'vitest';

import { roles } from '../../shared/utils/permissions';

import * as schema from '#db/schema';

const migrationsFolder = fileURLToPath(
  new URL('../../server/database/migrations/', import.meta.url)
);
const previousMigrations = mkdtempSync(
  join(tmpdir(), 'awg-keepalive-migrations-')
);
const journal = JSON.parse(
  readFileSync(join(migrationsFolder, 'meta/_journal.json'), 'utf8')
);
journal.entries = journal.entries.filter(
  (entry: { idx: number }) => entry.idx < 12
);
mkdirSync(join(previousMigrations, 'meta'));
writeFileSync(
  join(previousMigrations, 'meta/_journal.json'),
  JSON.stringify(journal)
);
for (const entry of journal.entries)
  copyFileSync(
    join(migrationsFolder, `${entry.tag}.sql`),
    join(previousMigrations, `${entry.tag}.sql`)
  );
afterAll(() => rmSync(previousMigrations, { recursive: true, force: true }));

test('keepalive migration preserves clients, defaults, links, profile metadata and the ID sequence with foreign keys enabled', async () => {
  const sqlite = createClient({ url: 'file::memory:' });
  const db = drizzle({ client: sqlite, schema });
  try {
    await migrate(db, { migrationsFolder: previousMigrations });
    await sqlite.execute('PRAGMA foreign_keys=ON');
    await db.insert(schema.user).values({
      id: 1,
      username: 'admin',
      name: 'Admin',
      password: null,
      role: roles.ADMIN,
      totpVerified: false,
      enabled: true,
    });
    await db.update(schema.wgInterface).set({
      awgProtocolVersion: '3.1',
      awgProfileGenerated: true,
      h1: '5',
      h2: '6',
      h3: '7',
      h4: '8',
    });
    await db.update(schema.userConfig).set({ defaultPersistentKeepalive: 25 });
    const values = {
      name: 'Existing',
      userId: 1,
      interfaceId: 'wg0',
      privateKey: 'key',
      publicKey: 'key',
      preSharedKey: 'key',
      ipv4Address: '10.8.0.2',
      ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:2',
      mtu: 1420,
      persistentKeepalive: 30,
      serverAllowedIps: [],
      enabled: true,
    };
    const [created] = await db.insert(schema.client).values(values).returning();
    await db.insert(schema.oneTimeLink).values({
      id: created!.id,
      oneTimeLink: 'preserve-this-link',
      expiresAt: '2030-01-01',
    });
    await db.insert(schema.client).values({
      ...values,
      id: 100,
      ipv4Address: '10.8.0.3',
      ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:3',
      publicKey: 'other-key',
    });
    await sqlite.execute('DELETE FROM clients_table WHERE id=100');
    const beforeClients = await db.query.client.findMany();
    const beforeLinks = await db.query.oneTimeLink.findMany();
    const beforeDefaults = await db.query.userConfig.findFirst();
    const beforeInterface = await db.query.wgInterface.findFirst();
    await migrate(db, { migrationsFolder });
    expect(await db.query.client.findMany()).toEqual(beforeClients);
    expect(await db.query.oneTimeLink.findMany()).toEqual(beforeLinks);
    expect(await db.query.userConfig.findFirst()).toEqual(beforeDefaults);
    expect(await db.query.wgInterface.findFirst()).toEqual(beforeInterface);
    expect(
      (await sqlite.execute('PRAGMA foreign_key_check')).rows
    ).toHaveLength(0);
    expect((await sqlite.execute('PRAGMA foreign_keys')).rows[0]![0]).toBe(1);
    expect(
      (
        await sqlite.execute(
          'SELECT typeof(persistent_keepalive) FROM clients_table'
        )
      ).rows[0]![0]
    ).toBe('text');
    const [next] = await db
      .insert(schema.client)
      .values({
        ...values,
        persistentKeepalive: '20-30',
        ipv4Address: '10.8.0.3',
        ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:3',
        publicKey: 'other-key',
      })
      .returning();
    expect(next!.id).toBeGreaterThan(100);
    expect(next!.persistentKeepalive).toBe('20-30');
    await db
      .update(schema.userConfig)
      .set({ defaultPersistentKeepalive: '20-30' });
    await migrate(db, { migrationsFolder });
    expect(
      (await db.query.userConfig.findFirst())!.defaultPersistentKeepalive
    ).toBe('20-30');
    expect(await db.query.oneTimeLink.findMany()).toEqual(beforeLinks);
  } finally {
    sqlite.close();
  }
});
