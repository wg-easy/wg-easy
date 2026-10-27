import { describe, expect, test } from 'vitest';

import { databaseFixture } from '../helpers/database';

import {
  generateClientConfig,
  generateServerConfig,
} from '#server/features/vpn/configuration';
import * as schema from '#db/schema';
import { ClientUpdateSchema } from '#shared/contracts/client';
import { InterfaceUpdateSchema } from '#shared/contracts/interface';
import { UserConfigUpdateSchema } from '#shared/contracts/userConfig';
import { MtuSchema } from '#shared/contracts/validation';

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
    const options = { amnezia: executable === 'awg' };
    const { db } = await databaseFixture();
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

    expect(
      generateServerConfig(wgInterface, hooks, [client], options)
    ).toContain('\nMTU = 1420\n');
    expect(
      generateClientConfig(wgInterface, userConfig, client, options)
    ).toContain('\nMTU = 1280\n');

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

    const serverConfig = generateServerConfig(
      clearedInterface,
      hooks,
      [clearedClient],
      options
    );
    // A cleared client MTU must not fall back to a nonempty default.
    const clientConfig = generateClientConfig(
      clearedInterface,
      userConfig,
      clearedClient,
      options
    );
    expect(serverConfig).not.toMatch(/^MTU\s*=/m);
    expect(clientConfig).not.toMatch(/^MTU\s*=/m);
  }
);
