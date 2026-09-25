import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterEach, describe, expect, test } from 'vitest';

import * as schema from '#db/schema';
import {
  isAbsentWireGuardInterface,
  prepareInterfaceRename,
} from '#db/renameInterface';

const migrationsFolder = fileURLToPath(
  new URL('../../server/database/migrations', import.meta.url)
);

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true })));
});

async function migratedDb() {
  const dir = await mkdtemp(join(tmpdir(), 'wg-easy-rename-'));
  dirs.push(dir);
  const client = createClient({ url: `file:${join(dir, 'wg-easy.db')}` });
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder });
  // Migrations may enable foreign keys on this connection. A later process
  // start does not re-run them, so the rename must enable foreign keys itself.
  client.close();
  const restarted = createClient({ url: `file:${join(dir, 'wg-easy.db')}` });
  const restartedDb = drizzle({ client: restarted, schema });
  await restartedDb.run(sql`
    INSERT INTO users_table (username, name, role, totp_verified, enabled)
    VALUES ('admin', 'Admin', 1, 0, 1)
  `);
  await restartedDb.run(sql`
    INSERT INTO clients_table (
      user_id, interface_id, name, ipv4_address, ipv6_address,
      private_key, public_key, pre_shared_key, server_allowed_ips,
      persistent_keepalive, mtu, enabled
    ) VALUES (
      1, 'wg0', 'phone', '10.8.0.2', 'fdcc:ad94:bacf:61a4::2',
      'priv', 'pub', 'psk', '["0.0.0.0/0"]', 0, 1420, 1
    )
  `);
  return { client: restarted, db: restartedDb };
}

async function ids(db: Awaited<ReturnType<typeof migratedDb>>['db']) {
  const iface = await db.query.wgInterface.findFirst();
  const hooks = await db.query.hooks.findFirst();
  const userConfig = await db.query.userConfig.findFirst();
  const clients = await db.query.client.findMany();
  return {
    interfaceName: iface?.name,
    hooksId: hooks?.id,
    userConfigId: userConfig?.id,
    clientInterfaceId: clients.map((client) => client.interfaceId),
  };
}

describe('prepareInterfaceRename', () => {
  test('leaves rows alone when the name already matches', async () => {
    const { client, db } = await migratedDb();
    const downs: string[] = [];

    await prepareInterfaceRename(client, db, 'wg0', async (name) => {
      downs.push(name);
    });

    expect(downs).toEqual([]);
    expect(await ids(db)).toEqual({
      interfaceName: 'wg0',
      hooksId: 'wg0',
      userConfigId: 'wg0',
      clientInterfaceId: ['wg0'],
    });
  });

  test('downs the old interface before cascading the rename', async () => {
    const { client, db } = await migratedDb();
    const seenDuringDown: string[] = [];

    await prepareInterfaceRename(
      client,
      db,
      'wg1',
      async (name) => {
        seenDuringDown.push(name);
        expect((await ids(db)).interfaceName).toBe('wg0');
      },
      async () => true
    );

    expect(seenDuringDown).toEqual(['wg0']);
    expect(await ids(db)).toEqual({
      interfaceName: 'wg1',
      hooksId: 'wg1',
      userConfigId: 'wg1',
      clientInterfaceId: ['wg1'],
    });
  });

  test('does not stop a seeded wg0 that this instance never configured', async () => {
    const { client, db } = await migratedDb();
    const downs: string[] = [];

    await prepareInterfaceRename(
      client,
      db,
      'wg1',
      async (name) => {
        downs.push(name);
      },
      async () => false
    );

    expect(downs).toEqual([]);
    expect((await ids(db)).interfaceName).toBe('wg1');
    expect((await ids(db)).hooksId).toBe('wg1');
  });

  test('renames when the old interface was never up', async () => {
    const { client, db } = await migratedDb();

    await prepareInterfaceRename(
      client,
      db,
      'wg1',
      async () => {
        throw new Error("wg-quick: `wg0' is not a WireGuard interface");
      },
      async () => true
    );

    expect((await ids(db)).hooksId).toBe('wg1');
    expect((await ids(db)).clientInterfaceId).toEqual(['wg1']);
  });

  test('does not rename when taking the old interface down fails', async () => {
    const { client, db } = await migratedDb();

    await expect(
      prepareInterfaceRename(
        client,
        db,
        'wg1',
        async () => {
          throw new Error('iptables: Resource temporarily unavailable');
        },
        async () => true
      )
    ).rejects.toThrow('Resource temporarily unavailable');

    expect(await ids(db)).toMatchObject({
      interfaceName: 'wg0',
      hooksId: 'wg0',
      clientInterfaceId: ['wg0'],
    });
  });
});

describe('isAbsentWireGuardInterface', () => {
  test('matches wg-quick and kernel missing-device errors', () => {
    expect(
      isAbsentWireGuardInterface(new Error('Cannot find device "wg0"'))
    ).toBe(true);
    expect(isAbsentWireGuardInterface(new Error('iptables lock'))).toBe(false);
  });
});
