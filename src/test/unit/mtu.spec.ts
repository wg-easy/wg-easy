import { fileURLToPath } from 'node:url';

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { describe, expect, onTestFinished, test, vi } from 'vitest';

import * as schema from '#db/schema';
import { ClientUpdateSchema } from '#db/repositories/client/types';
import { InterfaceUpdateSchema } from '#db/repositories/interface/types';
import { UserConfigUpdateSchema } from '#db/repositories/userConfig/types';
import { MtuSchema } from '#server/utils/types';

const { config } = vi.hoisted(() => ({
  config: { WG_EXECUTABLE: 'wg', PORT: '51821' },
}));

vi.mock('#server/utils/config', () => ({ WG_ENV: config }));

describe('MTU validation', () => {
  test('accepts automatic MTU or a value from 1024 to 9000', () => {
    expect(MtuSchema.parse(null)).toBeNull();
    for (const mtu of [1024, 9000]) {
      expect(MtuSchema.parse(mtu)).toBe(mtu);
    }
    for (const mtu of [0, 1023, 9001, 'invalid']) {
      expect(MtuSchema.safeParse(mtu).success).toBe(false);
    }
  });
});

test.each(['wg', 'awg'])(
  '%s emits explicit MTUs and omits automatic MTUs',
  async (executable) => {
    config.WG_EXECUTABLE = executable;
    vi.resetModules();
    const { wg } = await import('#server/utils/wgHelper');
    const connection = createClient({ url: ':memory:' });
    onTestFinished(() => connection.close());
    const db = drizzle({ client: connection, schema });
    const migrations = readMigrationFiles({
      migrationsFolder: fileURLToPath(
        new URL('../../server/database/migrations', import.meta.url)
      ),
    });

    await connection.migrate(migrations.flatMap((m) => m.sql));
    await db.insert(schema.user).values({
      id: 1,
      username: 'admin',
      name: 'Admin',
      role: 1,
      totpVerified: false,
      enabled: true,
    });
    await db.update(schema.userConfig).set({ host: 'vpn.example.com' });
    await db.update(schema.wgInterface).set({
      h1: '5',
      h2: '6',
      h3: '7',
      h4: '8',
    });
    await db.insert(schema.client).values({
      id: 1,
      userId: 1,
      interfaceId: 'wg0',
      name: 'Test client',
      ipv4Address: '10.8.0.2',
      ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:2',
      privateKey: 'client-private-key',
      publicKey: 'client-public-key',
      preSharedKey: 'preshared-key',
      serverAllowedIps: [],
      persistentKeepalive: 0,
      mtu: 1280,
      enabled: true,
    });
    const client = (await db.select().from(schema.client))[0]!;
    const wgInterface = (await db.select().from(schema.wgInterface))[0]!;
    const userConfig = (await db.select().from(schema.userConfig))[0]!;
    const hooks = (await db.select().from(schema.hooks))[0]!;

    expect(wg.generateServerInterface(wgInterface, hooks)).toContain(
      '\nMTU = 1420\n'
    );
    expect(wg.generateClientConfig(wgInterface, userConfig, client)).toContain(
      '\nMTU = 1280\n'
    );

    await db
      .update(schema.wgInterface)
      .set(InterfaceUpdateSchema.parse({ ...wgInterface, mtu: null }));
    await db
      .update(schema.client)
      .set(ClientUpdateSchema.parse({ ...client, mtu: null }));
    await db.update(schema.userConfig).set(
      UserConfigUpdateSchema.parse({
        ...userConfig,
        defaultMtu: null,
      })
    );

    const clearedInterface = (await db.select().from(schema.wgInterface))[0]!;
    const clearedClient = (await db.select().from(schema.client))[0]!;
    const clearedDefaults = (await db.select().from(schema.userConfig))[0]!;
    expect(clearedInterface.mtu).toBeNull();
    expect(clearedClient.mtu).toBeNull();
    expect(clearedDefaults.defaultMtu).toBeNull();

    const serverConfig = wg.generateServerInterface(clearedInterface, hooks);
    // A cleared client MTU must not fall back to a nonempty default.
    const clientConfig = wg.generateClientConfig(
      clearedInterface,
      userConfig,
      clearedClient
    );
    expect(serverConfig).not.toMatch(/^MTU\s*=/m);
    expect(clientConfig).not.toMatch(/^MTU\s*=/m);
  }
);
