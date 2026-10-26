import { fileURLToPath } from 'node:url';

import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { beforeEach, afterEach, expect, test, vi } from 'vitest';

import { roles } from '#shared/utils/permissions';
import * as schema from '#db/schema';
import { ClientService } from '#db/repositories/client/service';
import { ClientUpdateSchema } from '#db/repositories/client/types';
import { InterfaceService } from '#db/repositories/interface/service';
import { UserConfigService } from '#db/repositories/userConfig/service';
import { UserConfigUpdateSchema } from '#db/repositories/userConfig/types';
import WireGuard from '#server/utils/WireGuard';
import { encodeQRCode } from '#server/utils/qr';

const mocks = vi.hoisted(() => ({
  env: { WG_EXECUTABLE: 'awg', WG_INTERFACE: 'wg0' },
  database: {
    clients: { get: vi.fn() },
    userConfigs: { get: vi.fn() },
    interfaces: { get: vi.fn() },
  },
}));
vi.mock('#server/utils/config', () => ({ WG_ENV: mocks.env, OLD_ENV: {} }));
vi.mock('#server/utils/Database', () => ({ default: mocks.database }));
vi.mock('#server/utils/wgHelper', async (original) => {
  const { wg } = await original<typeof import('#server/utils/wgHelper')>();
  return {
    wg: {
      ...wg,
      generatePrivateKey: async () => KEY,
      getPublicKey: async () => KEY,
      generatePreSharedKey: async () => KEY,
    },
  };
});
vi.mock('#server/utils/qr', async (original) => {
  const actual = await original<typeof import('#server/utils/qr')>();
  return { ...actual, encodeQRCode: vi.fn(actual.encodeQRCode) };
});
const KEY = Buffer.alloc(32, 1).toString('base64');
const migrationsFolder = fileURLToPath(
  new URL('../../server/database/migrations/', import.meta.url)
);
let sqlite: Client;
let clients: ClientService;
let defaults: UserConfigService;
let interfaces: InterfaceService;

beforeEach(async () => {
  mocks.env.WG_EXECUTABLE = 'awg';
  vi.clearAllMocks();
  sqlite = createClient({ url: 'file::memory:' });
  const db = drizzle({ client: sqlite, schema });
  await migrate(db, { migrationsFolder });
  clients = new ClientService(db);
  defaults = new UserConfigService(db);
  interfaces = new InterfaceService(db);
  await db.insert(schema.user).values({
    id: 1,
    username: 'admin',
    name: 'Admin',
    password: null,
    role: roles.ADMIN,
    enabled: true,
    totpVerified: false,
  });
  await interfaces.updateKeyPair(KEY, KEY);
  await defaults.update({ host: 'vpn.example.com' });
  mocks.database.clients.get.mockImplementation((id: number) =>
    clients.get(id)
  );
  mocks.database.userConfigs.get.mockImplementation(() => defaults.get());
  mocks.database.interfaces.get.mockImplementation(() => interfaces.get());
});
afterEach(() => sqlite.close());

test('copies ranges into new/imported clients and exports identical configuration to the QR encoder', async () => {
  const settings = UserConfigUpdateSchema.parse({
    ...(await defaults.get()),
    defaultPersistentKeepalive: '020-030',
  });
  await defaults.update(settings);
  const created = await clients.create({ name: 'Client', expiresAt: null });
  const id = created[0]!.clientId;
  expect((await clients.get(id))!.persistentKeepalive).toBe('20-30');
  const config = await WireGuard.getClientConfiguration({ clientId: id });
  expect(config).toContain('PersistentKeepalive = 20-30');
  await WireGuard.getClientQRCodeSVG({ clientId: id });
  expect(encodeQRCode).toHaveBeenLastCalledWith(config);
  await clients.createFromExisting({
    name: 'Imported',
    enabled: true,
    privateKey: KEY,
    publicKey: Buffer.alloc(32, 2).toString('base64'),
    preSharedKey: KEY,
    ipv4Address: '10.8.0.3',
    ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:3',
  });
  expect(
    (await clients.getAll()).every((c) => c.persistentKeepalive === '20-30')
  ).toBe(true);
  await defaults.update({ defaultPersistentKeepalive: 25 });
  expect((await clients.get(id))!.persistentKeepalive).toBe('20-30');
  const client = (await clients.get(id))!;
  await clients.update(
    id,
    ClientUpdateSchema.parse({ ...client, persistentKeepalive: '30-40' })
  );
  expect((await clients.get(id))!.persistentKeepalive).toBe('30-40');
});

test('preserves numeric single values and disabled keepalive', async () => {
  await defaults.update({ defaultPersistentKeepalive: 0 });
  const created = await clients.create({ name: 'Client', expiresAt: null });
  const id = created[0]!.clientId;
  expect((await clients.get(id))!.persistentKeepalive).toBe(0);
  const client = (await clients.get(id))!;
  await clients.update(
    id,
    ClientUpdateSchema.parse({ ...client, persistentKeepalive: '25-25' })
  );
  expect((await clients.get(id))!.persistentKeepalive).toBe(25);
});

test('WireGuard rejects range defaults and client edits', async () => {
  const created = await clients.create({ name: 'Client', expiresAt: null });
  const id = created[0]!.clientId;
  mocks.env.WG_EXECUTABLE = 'wg';
  await expect(
    defaults.update({ defaultPersistentKeepalive: '20-30' })
  ).rejects.toThrow('require AmneziaWG');
  const client = (await clients.get(id))!;
  await expect(
    clients.update(
      id,
      ClientUpdateSchema.parse({ ...client, persistentKeepalive: '20-30' })
    )
  ).rejects.toThrow('require AmneziaWG');
});
