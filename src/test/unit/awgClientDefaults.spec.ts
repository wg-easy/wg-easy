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

import { createClient, type Client } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';

import { roles } from '../../shared/utils/permissions';

import { ClientService } from '#db/repositories/client/service';
import { ClientUpdateSchema } from '#db/repositories/client/types';
import { InterfaceService } from '#db/repositories/interface/service';
import { UserConfigService } from '#db/repositories/userConfig/service';
import {
  UserConfigUpdateSchema,
  type UserConfigUpdateType,
} from '#db/repositories/userConfig/types';
import * as schema from '#db/schema';
import type { DBType } from '#db/sqlite';
import WireGuard from '#server/utils/WireGuard';
import { encodeQRCode } from '#server/utils/qr';
import { wg } from '#server/utils/wgHelper';

const mocks = vi.hoisted(() => ({
  env: { WG_INTERFACE: 'wg0', WG_EXECUTABLE: 'awg', DISABLE_IPV6: false },
  database: {
    clients: { get: vi.fn() },
    userConfigs: { get: vi.fn() },
    interfaces: { get: vi.fn() },
  },
  key: 0,
}));

vi.mock('#server/utils/config', () => ({ WG_ENV: mocks.env, OLD_ENV: {} }));
vi.mock('#server/utils/Database', () => ({ default: mocks.database }));
vi.mock('#server/utils/wgHelper', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('#server/utils/wgHelper')>();
  return {
    wg: {
      ...original.wg,
      generatePrivateKey: vi.fn(async () => KEY),
      getPublicKey: vi.fn(async () =>
        Buffer.alloc(32, ++mocks.key).toString('base64')
      ),
      generatePreSharedKey: vi.fn(async () => KEY),
    },
  };
});
vi.mock('#server/utils/qr', async (importOriginal) => {
  const original = await importOriginal<typeof import('#server/utils/qr')>();
  return { ...original, encodeQRCode: vi.fn(original.encodeQRCode) };
});
vi.mock('#shared/utils/time', () => ({ setIntervalImmediately: vi.fn() }));

const KEY = 'JPJ2DWzJbwrRkY6cPbZaJasL6bHQOM6J2Ollx4D/OHU=';
const migrationsFolder = fileURLToPath(
  new URL('../../server/database/migrations/', import.meta.url)
);
const previousMigrations = mkdtempSync(join(tmpdir(), 'wg-easy-migrations-'));
const journal = JSON.parse(
  readFileSync(join(migrationsFolder, 'meta/_journal.json'), 'utf8')
);
journal.entries = journal.entries.filter(
  (entry: { idx: number }) => entry.idx < 10
);
mkdirSync(join(previousMigrations, 'meta'));
writeFileSync(
  join(previousMigrations, 'meta/_journal.json'),
  JSON.stringify(journal)
);
for (const entry of journal.entries) {
  copyFileSync(
    join(migrationsFolder, `${entry.tag}.sql`),
    join(previousMigrations, `${entry.tag}.sql`)
  );
}

const configuredDefaults = {
  defaultContentPaddingAddition: '10-100',
  defaultRekeyAfterTime: '100-120',
  defaultRekeyTimeout: '3-7',
  defaultRejectAfterTime: '150-180',
  defaultKeepaliveTimeout: '5-15',
  defaultMaxHandshakeAttempts: '15-20',
  defaultDisableCookies: false,
} satisfies Partial<UserConfigUpdateType>;

let sqlite: Client;
let db: DBType;
let clients: ClientService;
let defaults: UserConfigService;
let interfaces: InterfaceService;

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.key = 0;
  mocks.env.WG_EXECUTABLE = 'awg';
  sqlite = createClient({ url: 'file::memory:' });
  db = drizzle({ client: sqlite, schema });
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
    totpVerified: false,
    enabled: true,
  });
  await db
    .update(schema.wgInterface)
    .set({
      privateKey: KEY,
      publicKey: KEY,
      h1: '5',
      h2: '6',
      h3: '7',
      h4: '8',
      s1: 12,
      s2: 12,
      s3: 12,
      s4: 12,
      headerProtectionKey: KEY,
      randomTrailers: true,
    })
    .where(eq(schema.wgInterface.name, 'wg0'));
  await defaults.update({ host: 'vpn.example.com' });
  mocks.database.clients.get.mockImplementation((id: number) =>
    clients.get(id)
  );
  mocks.database.userConfigs.get.mockImplementation(() => defaults.get());
  mocks.database.interfaces.get.mockImplementation(() => interfaces.get());
});

afterEach(() => sqlite.close());
afterAll(() => rmSync(previousMigrations, { recursive: true, force: true }));

async function setDefaults(data: Partial<UserConfigUpdateType>) {
  const validated = UserConfigUpdateSchema.parse({
    ...(await defaults.get()),
    ...data,
  });
  await defaults.update(validated);
}

async function create(name = 'Client') {
  const [created] = await clients.create({ name, expiresAt: null });
  if (!created) throw new Error('Client was not created');
  return created.clientId;
}

describe('AWG client defaults', () => {
  test('leaves the new defaults and client parameters unset on a fresh database', async () => {
    const settings = await defaults.get();
    for (const field of Object.keys(configuredDefaults)) {
      expect(settings[field as keyof typeof configuredDefaults]).toBeNull();
    }
    const clientId = await create();
    const config = await WireGuard.getClientConfiguration({ clientId });
    expect(config).not.toMatch(
      /^(ContentPaddingAddition|RekeyAfterTime|RekeyTimeout|RejectAfterTime|KeepaliveTimeout|MaxHandshakeAttempts|DisableCookies) =/m
    );
  });

  test('persists defaults and copies them into a new client and its export', async () => {
    await setDefaults(configuredDefaults);
    expect(await defaults.get()).toMatchObject(configuredDefaults);
    const clientId = await create();
    expect(await clients.get(clientId)).toMatchObject({
      contentPaddingAddition: '10-100',
      rekeyAfterTime: '100-120',
      rekeyTimeout: '3-7',
      rejectAfterTime: '150-180',
      keepaliveTimeout: '5-15',
      maxHandshakeAttempts: '15-20',
      disableCookies: false,
    });
    const config = await WireGuard.getClientConfiguration({ clientId });
    for (const line of [
      'ContentPaddingAddition = 10-100',
      'RekeyAfterTime = 100-120',
      'RekeyTimeout = 3-7',
      'RejectAfterTime = 150-180',
      'KeepaliveTimeout = 5-15',
      'MaxHandshakeAttempts = 15-20',
      'DisableCookies = off',
      `HeaderProtectionKey = ${KEY}`,
      'RandomTrailers = on',
      'S4 = 12',
      'H4 = 8',
    ]) {
      expect(config.split('\n')).toContain(line);
    }
    expect(await WireGuard.getClientQRCodeSVG({ clientId })).toContain('<svg');
    expect(encodeQRCode).toHaveBeenCalledWith(config);
  });

  test('does not change existing profiles when defaults change or are cleared', async () => {
    const originalId = await create('Original');
    const originalConfig = await WireGuard.getClientConfiguration({
      clientId: originalId,
    });
    await setDefaults(configuredDefaults);
    const configuredId = await create('Configured');
    const configuredConfig = await WireGuard.getClientConfiguration({
      clientId: configuredId,
    });
    await setDefaults({
      defaultRekeyTimeout: null,
      defaultDisableCookies: true,
      defaultContentPaddingAddition: '0',
    });
    expect(
      await WireGuard.getClientConfiguration({ clientId: originalId })
    ).toBe(originalConfig);
    expect(
      await WireGuard.getClientConfiguration({ clientId: configuredId })
    ).toBe(configuredConfig);
    const newestId = await create('Newest');
    const newestConfig = await WireGuard.getClientConfiguration({
      clientId: newestId,
    });
    expect(newestConfig).toContain('ContentPaddingAddition = 0');
    expect(newestConfig).toContain('DisableCookies = on');
    expect(newestConfig).not.toContain('RekeyTimeout =');
  });

  test('allows an individual client to override or unset its copied defaults', async () => {
    await setDefaults(configuredDefaults);
    const clientId = await create();
    const saved = await clients.get(clientId);
    if (!saved) throw new Error('Client was not found');
    await clients.update(
      clientId,
      ClientUpdateSchema.parse({
        ...saved,
        contentPaddingAddition: '0',
        rekeyTimeout: null,
        disableCookies: true,
      })
    );
    const config = await WireGuard.getClientConfiguration({ clientId });
    expect(config).toContain('ContentPaddingAddition = 0');
    expect(config).toContain('DisableCookies = on');
    expect(config).not.toContain('RekeyTimeout =');
    expect(await defaults.get()).toMatchObject(configuredDefaults);
  });

  test('copies defaults, including I5, when creating a client from existing keys', async () => {
    await setDefaults({ ...configuredDefaults, defaultI5: '<r 4>' });
    await clients.createFromExisting({
      name: 'Imported',
      enabled: true,
      ipv4Address: '10.8.0.2',
      ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:2',
      privateKey: KEY,
      publicKey: KEY,
      preSharedKey: KEY,
    });
    const [saved] = await clients.getAll();
    expect(saved).toMatchObject({
      i5: '<r 4>',
      contentPaddingAddition: '10-100',
      rekeyAfterTime: '100-120',
      rekeyTimeout: '3-7',
      rejectAfterTime: '150-180',
      keepaliveTimeout: '5-15',
      maxHandshakeAttempts: '15-20',
      disableCookies: false,
    });
  });

  test.each([
    'defaultContentPaddingAddition',
    'defaultRekeyAfterTime',
    'defaultRekeyTimeout',
    'defaultRejectAfterTime',
    'defaultKeepaliveTimeout',
    'defaultMaxHandshakeAttempts',
  ])('validates and normalizes %s before saving', async (field) => {
    await setDefaults({ [field]: ' 30 - 90 ' });
    expect(await defaults.get()).toHaveProperty(field, '30-90');
    await expect(setDefaults({ [field]: '65536' })).rejects.toThrow();
    await expect(setDefaults({ [field]: '90-30' })).rejects.toThrow();
    expect(await defaults.get()).toHaveProperty(field, '30-90');
  });

  test('rejects non-boolean cookie defaults', async () => {
    expect(
      UserConfigUpdateSchema.safeParse({
        ...(await defaults.get()),
        defaultDisableCookies: 'off',
      }).success
    ).toBe(false);
  });

  test('omits AWG parameters when exporting in standard WireGuard mode', async () => {
    await setDefaults(configuredDefaults);
    const clientId = await create();
    const saved = await clients.get(clientId);
    if (!saved) throw new Error('Client was not found');
    mocks.env.WG_EXECUTABLE = 'wg';
    vi.doUnmock('#server/utils/wgHelper');
    vi.resetModules();
    const { wg: plainWg } = await import('#server/utils/wgHelper');
    const config = plainWg.generateClientConfig(
      await interfaces.get(),
      await defaults.get(),
      saved
    );
    expect(config).not.toMatch(
      /^(Jc|S1|H1|HeaderProtectionKey|ContentPaddingAddition|RekeyAfterTime|RandomTrailers|DisableCookies) =/m
    );
  });

  test('server settings do not become client defaults', async () => {
    await db.update(schema.wgInterface).set({
      contentPaddingAddition: '99',
      rekeyTimeout: '9',
      disableCookies: true,
    });
    const clientId = await create();
    const config = await WireGuard.getClientConfiguration({ clientId });
    expect(config).not.toMatch(
      /^(ContentPaddingAddition|RekeyTimeout|DisableCookies) =/m
    );
    const serverConfig = wg.generateServerInterface(await interfaces.get(), {
      id: 'wg0',
      preUp: '',
      postUp: '',
      preDown: '',
      postDown: '',
      createdAt: '',
      updatedAt: '',
    });
    expect(serverConfig).toContain('ContentPaddingAddition = 99');
    expect(serverConfig).toContain('RekeyTimeout = 9');
    expect(serverConfig).toContain('DisableCookies = on');
  });

  test('upgrades an existing database without changing client exports', async () => {
    const previous = createClient({ url: 'file::memory:' });
    try {
      const previousDb = drizzle({ client: previous, schema });
      await migrate(previousDb, { migrationsFolder: previousMigrations });
      await previous.execute({
        sql: `INSERT INTO users_table
          (id, username, name, role, totp_verified, enabled)
          VALUES (1, 'admin', 'Admin', 1, 0, 1)`,
        args: [],
      });
      await previousDb.insert(schema.client).values({
        name: 'Existing',
        userId: 1,
        interfaceId: 'wg0',
        privateKey: KEY,
        publicKey: KEY,
        preSharedKey: KEY,
        ipv4Address: '10.8.0.2',
        ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:2',
        mtu: 1420,
        persistentKeepalive: 0,
        serverAllowedIps: [],
        enabled: true,
        contentPaddingAddition: '0',
        rekeyTimeout: '4-8',
        disableCookies: false,
      });
      const before = await previousDb.query.client.findFirst();
      await migrate(previousDb, { migrationsFolder });
      expect(await previousDb.query.client.findFirst()).toEqual(before);
      const migratedDefaults = await new UserConfigService(previousDb).get();
      for (const field of Object.keys(configuredDefaults)) {
        expect(
          migratedDefaults[field as keyof typeof configuredDefaults]
        ).toBeNull();
      }
      const migratedClients = new ClientService(previousDb);
      const migratedInterface = await new InterfaceService(previousDb).get();
      if (!before) throw new Error('Existing client was not found');
      const after = await migratedClients.get(before.id);
      if (!after) throw new Error('Existing client was lost');
      expect(
        wg.generateClientConfig(migratedInterface, migratedDefaults, after)
      ).toBe(
        wg.generateClientConfig(migratedInterface, migratedDefaults, before)
      );
      // The migrator should also skip the already-applied migration on restart.
      await migrate(previousDb, { migrationsFolder });
      expect(await previousDb.query.client.findFirst()).toEqual(before);
    } finally {
      previous.close();
    }
  });
});
