import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate as drizzleMigrate } from 'drizzle-orm/libsql/migrator';
import { eq } from 'drizzle-orm';

import * as schema from '#db/schema';

describe('database migration', () => {
  test('migrates schema cleanly and allows null MTU in clients and userConfig', async () => {
    const client = createClient({ url: ':memory:' });
    const db = drizzle({ client, schema });

    const migrationsFolder = fileURLToPath(
      new URL('../../server/database/migrations', import.meta.url)
    );

    // Run all migrations from 0000 through 0008
    await drizzleMigrate(db, { migrationsFolder });

    // Verify initial seeded userConfig migrated cleanly with original default_mtu = 1420
    const initialConfig = await db.query.userConfig.findFirst({
      where: eq(schema.userConfig.id, 'wg0'),
    });
    expect(initialConfig?.defaultMtu).toBe(1420);

    // Verify updating userConfig to null defaultMtu succeeds
    await db
      .update(schema.userConfig)
      .set({ defaultMtu: null })
      .where(eq(schema.userConfig.id, 'wg0'));

    const updatedConfig = await db.query.userConfig.findFirst({
      where: eq(schema.userConfig.id, 'wg0'),
    });
    expect(updatedConfig?.defaultMtu).toBeNull();

    // Create user required for client foreign key
    await db.insert(schema.user).values({
      id: 1,
      username: 'admin',
      name: 'Admin',
      role: 1,
      totpVerified: 0,
      enabled: true,
    });

    // Verify client insertion with null MTU succeeds
    const [nullMtuClient] = await db
      .insert(schema.client)
      .values({
        userId: 1,
        interfaceId: 'wg0',
        name: 'test-null-mtu-client',
        ipv4Address: '10.8.0.2',
        ipv6Address: 'fd00::2',
        privateKey: 'priv1=',
        publicKey: 'pub1=',
        preSharedKey: 'psk1=',
        serverAllowedIps: [],
        persistentKeepalive: 25,
        mtu: null,
        enabled: true,
      })
      .returning();

    expect(nullMtuClient.mtu).toBeNull();

    const fetchedNullClient = await db.query.client.findFirst({
      where: eq(schema.client.id, nullMtuClient.id),
    });
    expect(fetchedNullClient?.mtu).toBeNull();

    // Verify client insertion with numeric MTU succeeds
    const [numericMtuClient] = await db
      .insert(schema.client)
      .values({
        userId: 1,
        interfaceId: 'wg0',
        name: 'test-numeric-mtu-client',
        ipv4Address: '10.8.0.3',
        ipv6Address: 'fd00::3',
        privateKey: 'priv2=',
        publicKey: 'pub2=',
        preSharedKey: 'psk2=',
        serverAllowedIps: [],
        persistentKeepalive: 25,
        mtu: 1420,
        enabled: true,
      })
      .returning();

    expect(numericMtuClient.mtu).toBe(1420);

    const fetchedNumericClient = await db.query.client.findFirst({
      where: eq(schema.client.id, numericMtuClient.id),
    });
    expect(fetchedNumericClient?.mtu).toBe(1420);

    await client.close();
  });
});
