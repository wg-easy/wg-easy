import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { ClientGroupService } from '../../server/database/repositories/clientGroup/service';
import * as schema from '../../server/database/schema';

const migrationsThrough0006 = [
  '0000_short_skin.sql',
  '0001_classy_the_stranger.sql',
  '0002_keen_sleepwalker.sql',
  '0003_breezy_colossus.sql',
  '0004_optimal_mandrill.sql',
  '0005_clumsy_korg.sql',
  '0006_clear_leech.sql',
];

const migration0007 = '0007_amused_madame_web.sql';

type LibsqlClient = ReturnType<typeof createClient>;
type TestDb = ReturnType<typeof drizzle<typeof schema>>;

async function applyMigration(client: LibsqlClient, migration: string) {
  const sql = readFileSync(
    join(process.cwd(), 'server', 'database', 'migrations', migration),
    'utf8'
  );

  const statements = sql
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter((statement) => statement !== 'PRAGMA journal_mode=WAL;')
    .filter(Boolean);

  for (const statement of statements) {
    await client.execute(statement);
  }
}

async function applyMigrations(client: LibsqlClient, migrations: string[]) {
  for (const migration of migrations) {
    await applyMigration(client, migration);
  }
}

async function createTestDb(
  migrations = [...migrationsThrough0006, migration0007]
) {
  const dir = mkdtempSync(join(tmpdir(), 'wg-easy-client-groups-'));
  const client = createClient({ url: `file:${join(dir, 'test.db')}` });
  await applyMigrations(client, migrations);
  await client.execute('PRAGMA foreign_keys=ON');

  const db = drizzle({ client, schema });
  return { client, db };
}

async function seedUser(db: TestDb) {
  await db.insert(schema.user).values({
    id: 1,
    username: 'admin',
    password: 'hash',
    email: null,
    name: 'Administrator',
    role: 2,
    totpVerified: false,
    enabled: true,
  });
}

async function seedClient(
  db: TestDb,
  data: Partial<typeof schema.client.$inferInsert> = {}
) {
  const [createdClient] = await db
    .insert(schema.client)
    .values({
      userId: 1,
      interfaceId: 'wg0',
      name: data.name ?? 'Phone',
      ipv4Address: data.ipv4Address ?? '10.8.0.2',
      ipv6Address: data.ipv6Address ?? 'fdcc:ad94:bacf:61a4::cafe:2',
      privateKey: data.privateKey ?? 'private',
      publicKey: data.publicKey ?? 'public',
      preSharedKey: data.preSharedKey ?? 'psk',
      allowedIps: data.allowedIps ?? ['10.0.0.0/24'],
      dns: data.dns ?? ['1.1.1.1'],
      firewallIps: data.firewallIps ?? ['10.0.0.1:443/tcp'],
      persistentKeepalive: data.persistentKeepalive ?? 0,
      mtu: data.mtu ?? 1420,
      serverAllowedIps: data.serverAllowedIps ?? [],
      enabled: data.enabled ?? true,
    })
    .returning()
    .execute();

  if (!createdClient) {
    throw new Error('Client was not created');
  }

  return createdClient;
}

async function seedExistingClientBefore0007(client: LibsqlClient) {
  await client.execute({
    sql: `INSERT INTO users_table
      (id, username, password, email, name, role, totp_verified, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [1, 'admin', 'hash', null, 'Administrator', 2, 0, 1],
  });

  await client.execute({
    sql: `INSERT INTO clients_table
      (
        id, user_id, interface_id, name, ipv4_address, ipv6_address,
        pre_up, post_up, pre_down, post_down,
        private_key, public_key, pre_shared_key, expires_at,
        allowed_ips, server_allowed_ips, firewall_ips,
        persistent_keepalive, mtu, j_c, j_min, j_max,
        i1, i2, i3, i4, i5, dns, server_endpoint, enabled
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      7,
      1,
      'wg0',
      'Migrated Phone',
      '10.8.0.77',
      'fdcc:ad94:bacf:61a4::cafe:77',
      'pre-up',
      'post-up',
      'pre-down',
      'post-down',
      'private-existing',
      'public-existing',
      'psk-existing',
      '2030-01-01T00:00:00.000Z',
      JSON.stringify(['10.77.0.0/24']),
      JSON.stringify(['192.168.77.0/24']),
      JSON.stringify(['10.77.0.10:8443/tcp']),
      25,
      1280,
      9,
      11,
      999,
      'i1-value',
      'i2-value',
      'i3-value',
      'i4-value',
      'i5-value',
      JSON.stringify(['9.9.9.9']),
      'vpn.example.test',
      0,
    ],
  });
}

describe('ClientGroupService', () => {
  let client: LibsqlClient;
  let db: TestDb;
  let service: ClientGroupService;

  beforeEach(async () => {
    const testDb = await createTestDb();
    client = testDb.client;
    db = testDb.db;
    service = new ClientGroupService(db);
    await seedUser(db);
  });

  afterEach(async () => {
    await client.close();
  });

  test('creates, lists deterministically, gets, updates, and deletes client groups', async () => {
    const secondGroup = await service.create({
      name: 'Vendors',
      description: 'External vendor devices',
      allowedIps: ['10.20.0.0/24'],
      dns: ['9.9.9.9'],
      firewallIps: ['10.20.0.10:443/tcp'],
    });
    const firstGroup = await service.create({
      name: 'Customers',
      description: 'Production customer devices',
      allowedIps: ['10.10.0.0/24'],
      dns: ['1.1.1.1'],
      firewallIps: ['10.10.0.10:443/tcp'],
    });

    expect(firstGroup.createdAt).toBeInstanceOf(Date);
    expect(firstGroup.updatedAt).toBeInstanceOf(Date);
    await expect(service.list()).resolves.toMatchObject([
      { id: firstGroup.id, name: 'Customers', assignedClientCount: 0 },
      { id: secondGroup.id, name: 'Vendors', assignedClientCount: 0 },
    ]);

    await expect(service.get(firstGroup.id)).resolves.toMatchObject({
      id: firstGroup.id,
      assignedClientCount: 0,
    });
    await expect(service.get(9999)).resolves.toBeUndefined();

    await expect(
      service.update(firstGroup.id, {
        name: 'Internal Staff',
        description: null,
        allowedIps: null,
        dns: null,
        firewallIps: [],
      })
    ).resolves.toMatchObject({
      id: firstGroup.id,
      name: 'Internal Staff',
      description: null,
      allowedIps: null,
      dns: null,
      firewallIps: [],
    });

    await expect(
      service.update(9999, {
        name: 'Missing',
        description: null,
        allowedIps: null,
        dns: null,
        firewallIps: null,
      })
    ).rejects.toThrow('Client group not found');

    await service.delete(firstGroup.id);
    await expect(service.get(firstGroup.id)).resolves.toBeUndefined();
  });

  test('assigns, unassigns, counts, and handles missing clients or groups', async () => {
    const existingClient = await seedClient(db);
    const group = await service.create({
      name: 'Temporary Contractors',
      description: null,
      allowedIps: null,
      dns: null,
      firewallIps: null,
    });

    await service.assignClient(existingClient.id, group.id);
    await expect(service.countAssignedClients(group.id)).resolves.toBe(1);
    await expect(service.get(group.id)).resolves.toMatchObject({
      assignedClientCount: 1,
    });
    await expect(db.query.client.findFirst()).resolves.toMatchObject({
      groupId: group.id,
    });

    await expect(service.assignClient(9999, group.id)).rejects.toThrow(
      'Client not found'
    );
    await expect(service.assignClient(existingClient.id, 9999)).rejects.toThrow(
      'Client group not found'
    );

    await service.unassignClient(existingClient.id);
    await expect(service.countAssignedClients(group.id)).resolves.toBe(0);
    await expect(db.query.client.findFirst()).resolves.toMatchObject({
      groupId: null,
    });

    await expect(service.unassignClient(9999)).resolves.toBeDefined();
  });

  test('deleting a group with assigned clients sets clients to unassigned', async () => {
    const existingClient = await seedClient(db);
    const group = await service.create({
      name: 'External Vendor',
      description: null,
      allowedIps: null,
      dns: null,
      firewallIps: null,
    });

    await service.assignClient(existingClient.id, group.id);
    await service.delete(group.id);

    await expect(db.query.client.findFirst()).resolves.toMatchObject({
      id: existingClient.id,
      groupId: null,
      name: 'Phone',
    });
  });

  test('preserves null, empty, and non-empty group JSON values', async () => {
    const nullGroup = await service.create({
      name: 'Null Values',
      description: null,
      allowedIps: null,
      dns: null,
      firewallIps: null,
    });
    const emptyGroup = await service.create({
      name: 'Empty Values',
      description: null,
      allowedIps: [],
      dns: [],
      firewallIps: [],
    });
    const configuredGroup = await service.create({
      name: 'Configured Values',
      description: null,
      allowedIps: ['10.30.0.0/24'],
      dns: ['8.8.8.8'],
      firewallIps: ['10.30.0.10:443/tcp'],
    });

    await expect(service.get(nullGroup.id)).resolves.toMatchObject({
      allowedIps: null,
      dns: null,
      firewallIps: null,
    });
    await expect(service.get(emptyGroup.id)).resolves.toMatchObject({
      allowedIps: [],
      dns: [],
      firewallIps: [],
    });
    await expect(service.get(configuredGroup.id)).resolves.toMatchObject({
      allowedIps: ['10.30.0.0/24'],
      dns: ['8.8.8.8'],
      firewallIps: ['10.30.0.10:443/tcp'],
    });

    await service.update(configuredGroup.id, {
      name: 'Configured Values',
      description: null,
      allowedIps: [],
      dns: [],
      firewallIps: [],
    });
    await expect(service.get(configuredGroup.id)).resolves.toMatchObject({
      allowedIps: [],
      dns: [],
      firewallIps: [],
    });
  });

  test('trims names, rejects whitespace-only names, and rejects exact duplicates', async () => {
    await expect(
      service.create({
        name: '  Customers  ',
        description: null,
        allowedIps: null,
        dns: null,
        firewallIps: null,
      })
    ).resolves.toMatchObject({ name: 'Customers' });

    await expect(
      service.create({
        name: '   ',
        description: null,
        allowedIps: null,
        dns: null,
        firewallIps: null,
      })
    ).rejects.toThrow();

    await expect(
      service.create({
        name: 'Customers',
        description: null,
        allowedIps: null,
        dns: null,
        firewallIps: null,
      })
    ).rejects.toThrow();
  });

  test('upgrades existing 0006 clients through migration 0007', async () => {
    await client.close();
    const testDb = await createTestDb(migrationsThrough0006);
    client = testDb.client;
    await seedExistingClientBefore0007(client);

    await applyMigration(client, migration0007);
    await client.execute('PRAGMA foreign_keys=ON');
    db = drizzle({ client, schema });
    service = new ClientGroupService(db);

    const existingClient = await db.query.client.findFirst();
    expect(existingClient).toMatchObject({
      id: 7,
      name: 'Migrated Phone',
      ipv4Address: '10.8.0.77',
      ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:77',
      preUp: 'pre-up',
      postUp: 'post-up',
      preDown: 'pre-down',
      postDown: 'post-down',
      privateKey: 'private-existing',
      publicKey: 'public-existing',
      preSharedKey: 'psk-existing',
      expiresAt: '2030-01-01T00:00:00.000Z',
      allowedIps: ['10.77.0.0/24'],
      serverAllowedIps: ['192.168.77.0/24'],
      firewallIps: ['10.77.0.10:8443/tcp'],
      persistentKeepalive: 25,
      mtu: 1280,
      jC: 9,
      jMin: 11,
      jMax: 999,
      i1: 'i1-value',
      i2: 'i2-value',
      i3: 'i3-value',
      i4: 'i4-value',
      i5: 'i5-value',
      dns: ['9.9.9.9'],
      serverEndpoint: 'vpn.example.test',
      enabled: false,
      groupId: null,
    });

    const group = await service.create({
      name: 'Migrated Group',
      description: null,
      allowedIps: [],
      dns: [],
      firewallIps: [],
    });

    await service.assignClient(7, group.id);
    await expect(db.query.client.findFirst()).resolves.toMatchObject({
      id: 7,
      groupId: group.id,
    });

    await service.delete(group.id);
    await expect(db.query.client.findFirst()).resolves.toMatchObject({
      id: 7,
      name: 'Migrated Phone',
      groupId: null,
    });
  });
});
