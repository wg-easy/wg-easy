import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { sql } from 'drizzle-orm';
import { beforeEach, afterEach, expect, test, vi } from 'vitest';

import * as schema from '#db/schema';
import { ClientService } from '#db/repositories/client/service';
import { InterfaceService } from '#db/repositories/interface/service';
import { InterfaceUpdateSchema } from '#db/repositories/interface/types';
import { UserConfigService } from '#db/repositories/userConfig/service';
import { UserConfigUpdateSchema } from '#db/repositories/userConfig/types';
import {
  verifyAwgProfileSupport,
  type AwgCommand,
} from '#server/utils/awgCapabilities';
import {
  parseAwgAutoGenerate,
  prepareAwgProfile,
} from '#server/utils/awgGeneration';
import { generateAwgProfile, type AwgProfile } from '#server/utils/awgProfile';

vi.mock('#server/utils/config', () => ({
  WG_ENV: { WG_INTERFACE: 'wg0', WG_EXECUTABLE: 'awg' },
}));
vi.mock('#server/utils/Database', () => ({ default: {} }));

const KEY = Buffer.alloc(32, 1).toString('base64');
const migrationsFolder = fileURLToPath(
  new URL('../../server/database/migrations/', import.meta.url)
);
const settings = { WG_EXECUTABLE: 'awg', AWG_AUTO_GENERATE: true };
let sqlite: Client;
let db: ReturnType<typeof drizzle<typeof schema>>;
let services: {
  interfaces: InterfaceService;
  clients: ClientService;
  userConfigs: UserConfigService;
};
let verify: ReturnType<typeof vi.fn<(profile: AwgProfile) => Promise<void>>>;

beforeEach(async () => {
  sqlite = createClient({ url: 'file::memory:' });
  db = drizzle({ client: sqlite, schema });
  await migrate(db, { migrationsFolder });
  services = {
    interfaces: new InterfaceService(db),
    clients: new ClientService(db),
    userConfigs: new UserConfigService(db),
  };
  verify = vi.fn(async () => {});
});
afterEach(() => sqlite.close());

test('generation is opt-in and invalid environment values fail clearly', () => {
  expect(parseAwgAutoGenerate(undefined)).toBe(false);
  expect(parseAwgAutoGenerate('false')).toBe(false);
  expect(parseAwgAutoGenerate('true')).toBe(true);
  expect(() => parseAwgAutoGenerate('yes')).toThrow('AWG_AUTO_GENERATE');
});

test('generates a valid AWG 3.1 server profile and available client defaults before creating VPN keys', async () => {
  const saved = await prepareAwgProfile(services, settings, verify);
  expect(saved.privateKey).toBe('---default---');
  expect(saved.awgProfileGenerated).toBe(true);
  expect(saved.headerProtectionKey).toMatch(/^[A-Za-z0-9+/]{43}=$/);
  expect(saved.s1).toBeGreaterThanOrEqual(12);
  expect(new Set([saved.s1, saved.s2, saved.s3, saved.s4]).size).toBe(1);
  expect(saved.randomTrailers).toBe(true);
  expect(saved.disableCookies).toBe(false);
  expect([
    saved.h1,
    saved.h2,
    saved.h3,
    saved.h4,
    saved.i1,
    saved.i2,
    saved.i3,
    saved.i4,
    saved.i5,
  ]).toEqual(Array(9).fill(null));
  expect(InterfaceUpdateSchema.safeParse(saved).success).toBe(true);
  const defaults = await services.userConfigs.get();
  expect(defaults.defaultJC).toBe(saved.jC);
  expect(defaults.defaultJMin).toBe(saved.jMin);
  expect(defaults.defaultJMax).toBe(saved.jMax);
  expect(defaults.host).toBe('');
  expect(
    UserConfigUpdateSchema.safeParse({ ...defaults, host: 'vpn.example.com' })
      .success
  ).toBe(true);
  if ('defaultRekeyTimeout' in defaults)
    expect(defaults.defaultRekeyTimeout).toBe(saved.rekeyTimeout);
  if ('defaultDisableCookies' in defaults)
    expect(defaults.defaultDisableCookies).toBe(false);
  expect(verify).toHaveBeenCalledOnce();
});

test('uses different keys for different generated profiles', () => {
  expect(generateAwgProfile().parameters.headerProtectionKey).not.toBe(
    generateAwgProfile().parameters.headerProtectionKey
  );
});

test('restarts reuse the saved profile, including retries before initial VPN key creation', async () => {
  const first = await prepareAwgProfile(services, settings, verify);
  expect(await prepareAwgProfile(services, settings, verify)).toEqual(first);
  await services.interfaces.updateKeyPair(KEY, KEY);
  const before = await services.interfaces.get();
  const defaults = await services.userConfigs.get();
  services.interfaces = new InterfaceService(db);
  expect(await prepareAwgProfile(services, settings, verify)).toEqual(before);
  expect(await services.userConfigs.get()).toEqual(defaults);
  expect(verify).toHaveBeenCalledOnce();
});

test('leaves existing settings unchanged unless generation is requested', async () => {
  await services.interfaces.updateKeyPair(KEY, KEY);
  const before = await services.interfaces.get();
  expect(
    await prepareAwgProfile(services, { WG_EXECUTABLE: 'awg' }, verify)
  ).toEqual(before);
  await expect(prepareAwgProfile(services, settings, verify)).rejects.toThrow(
    'fresh configuration'
  );
  expect(await services.interfaces.get()).toEqual(before);
  expect(verify).not.toHaveBeenCalled();
});

test('generation rejects an existing client even if the interface still has placeholder keys', async () => {
  await sqlite.execute(
    "INSERT INTO users_table (id,username,name,role,totp_verified,enabled) VALUES (1,'admin','Admin',1,0,1)"
  );
  await db.insert(schema.client).values({
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
  });
  await expect(prepareAwgProfile(services, settings, verify)).rejects.toThrow(
    'fresh configuration'
  );
  expect(verify).not.toHaveBeenCalled();
});

test('WireGuard rejects the AWG generation flag but otherwise leaves settings alone', async () => {
  const before = await services.interfaces.get();
  await expect(
    prepareAwgProfile(services, { ...settings, WG_EXECUTABLE: 'wg' }, verify)
  ).rejects.toThrow('requires AmneziaWG');
  expect(
    await prepareAwgProfile(services, { WG_EXECUTABLE: 'wg' }, verify)
  ).toEqual(before);
});

test('unsupported module/tools fail before saving any generated parameters', async () => {
  const before = await services.interfaces.get();
  verify.mockRejectedValueOnce(new Error('AWG 3.1 required'));
  await expect(prepareAwgProfile(services, settings, verify)).rejects.toThrow(
    'AWG 3.1 required'
  );
  expect(await services.interfaces.get()).toEqual(before);
});

test('failed profile persistence rolls back the client defaults in the same transaction', async () => {
  const before = await services.userConfigs.get();
  await db.run(
    sql`CREATE TRIGGER reject_profile BEFORE UPDATE ON interfaces_table BEGIN SELECT RAISE(ABORT, 'test failure'); END`
  );
  await expect(prepareAwgProfile(services, settings, verify)).rejects.toThrow();
  expect(await services.userConfigs.get()).toEqual(before);
  expect((await services.interfaces.get()).awgProfileGenerated).toBe(false);
});

test('invalid profile parameters cannot be committed', async () => {
  const profile = generateAwgProfile();
  profile.parameters.s1 = 0;
  const before = await services.userConfigs.get();
  await expect(
    services.interfaces.initializeAwgProfile(profile)
  ).rejects.toThrow();
  expect(await services.userConfigs.get()).toEqual(before);
  expect((await services.interfaces.get()).awgProfileGenerated).toBe(false);
});

function simulatedCommands(
  options: {
    ignoreFlag?: boolean;
    collapseRange?: boolean;
    addError?: boolean;
    toolError?: boolean;
    deleteError?: boolean;
  } = {}
) {
  const files: string[] = [];
  const active = new Set<string>();
  let configuration = '';
  const run = vi.fn<AwgCommand>(async (file, args) => {
    if (file === 'ip') {
      if (args[1] === 'add') {
        if (options.addError) throw new Error('not permitted');
        active.add(args[3]!);
      } else {
        if (options.deleteError) throw new Error('delete failed');
        active.delete(args[3]!);
      }
      return '';
    }
    if (args[0] === 'setconf') {
      files.push(args[2]!);
      if (options.toolError) throw new Error('secret key in tool error');
      configuration = await readFile(args[2]!, 'utf8');
      return '';
    }
    if (options.ignoreFlag)
      return configuration.replace('RandomTrailers = on', '');
    if (options.collapseRange)
      return configuration.replace(
        'PersistentKeepalive = 20-30',
        'PersistentKeepalive = 20'
      );
    return configuration;
  });
  return { run, files, active };
}

test('probe verifies 3.1 readback and cleans up without bringing the interface up', async () => {
  const mock = simulatedCommands();
  await verifyAwgProfileSupport(generateAwgProfile(), mock.run);
  expect(mock.active.size).toBe(0);
  for (const file of mock.files) await expect(access(file)).rejects.toThrow();
  expect(
    mock.run.mock.calls.some(
      ([file, args]) => file === 'ip' && args.includes('up')
    )
  ).toBe(false);
});

test.each([{ ignoreFlag: true }, { collapseRange: true }, { toolError: true }])(
  'probe rejects unsupported or failed readback without exposing tool errors: %s',
  async (options) => {
    const mock = simulatedCommands(options);
    await expect(
      verifyAwgProfileSupport(generateAwgProfile(), mock.run)
    ).rejects.toThrow('supporting AmneziaWG 3.1');
    expect(mock.active.size).toBe(0);
    for (const file of mock.files) await expect(access(file)).rejects.toThrow();
  }
);

test('failed probe creation never deletes an interface it does not own', async () => {
  const mock = simulatedCommands({ addError: true });
  await expect(
    verifyAwgProfileSupport(generateAwgProfile(), mock.run)
  ).rejects.toThrow('NET_ADMIN');
  expect(mock.run).toHaveBeenCalledOnce();
});

test('probe cleanup failures stop generation and still remove the temporary configuration', async () => {
  const mock = simulatedCommands({ deleteError: true });
  await expect(
    verifyAwgProfileSupport(generateAwgProfile(), mock.run)
  ).rejects.toThrow('Cannot remove');
  for (const file of mock.files) await expect(access(file)).rejects.toThrow();
});
