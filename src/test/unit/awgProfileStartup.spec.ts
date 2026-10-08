import { fileURLToPath } from 'node:url';

import { createClient, type Client } from '@libsql/client';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { roles } from '../../shared/utils/permissions';

import { ClientService } from '#db/repositories/client/service';
import { ClientUpdateSchema } from '#db/repositories/client/types';
import { InterfaceService } from '#db/repositories/interface/service';
import { InterfaceUpdateSchema } from '#db/repositories/interface/types';
import { UserConfigService } from '#db/repositories/userConfig/service';
import * as schema from '#db/schema';
import type { DBType } from '#db/sqlite';
import { generateAwgProfile } from '#server/utils/awgProfile';
import type { AwgVersion, AwgVersionRequest } from '#server/utils/awgProtocol';
import { prepareAwgProfile } from '#server/utils/awgStartup';
import { wg } from '#server/utils/wgHelper';

vi.mock('#server/utils/config', () => ({
  WG_ENV: { WG_INTERFACE: 'wg0', WG_EXECUTABLE: 'awg' },
}));
vi.mock('#server/utils/Database', () => ({ default: {} }));
vi.mock('#server/utils/wgHelper', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('#server/utils/wgHelper')>();
  return {
    wg: {
      ...original.wg,
      generatePrivateKey: vi.fn(async () => KEY),
      getPublicKey: vi.fn(async () => KEY),
      generatePreSharedKey: vi.fn(async () => KEY),
    },
  };
});

const KEY = Buffer.alloc(32, 1).toString('base64');
const migrationsFolder = fileURLToPath(
  new URL('../../server/database/migrations/', import.meta.url)
);
const settings = {
  WG_EXECUTABLE: 'awg',
  AWG_PROTOCOL_VERSION: 'latest' as AwgVersionRequest,
  AWG_AUTO_GENERATE: true,
};
let sqlite: Client;
let db: DBType;
let services: {
  interfaces: InterfaceService;
  userConfigs: UserConfigService;
  clients: ClientService;
};
let detect: ReturnType<
  typeof vi.fn<(requested: AwgVersionRequest) => Promise<AwgVersion>>
>;

beforeEach(async () => {
  sqlite = createClient({ url: 'file::memory:' });
  db = drizzle({ client: sqlite, schema });
  await migrate(db, { migrationsFolder });
  services = {
    interfaces: new InterfaceService(db),
    userConfigs: new UserConfigService(db),
    clients: new ClientService(db),
  };
  detect = vi.fn(async () => '3.1');
  await db.insert(schema.user).values({
    id: 1,
    username: 'admin',
    name: 'Admin',
    password: null,
    role: roles.ADMIN,
    totpVerified: false,
    enabled: true,
  });
});
afterEach(() => sqlite.close());

describe('persisted AWG startup profiles', () => {
  test.each(['2.0', '3.0', '3.1'] as const)(
    'generates a valid %s profile with matching defaults and exports',
    async (version) => {
      detect.mockResolvedValue(version);
      const profile = await prepareAwgProfile(services, settings, detect);
      expect(profile.awgProtocolVersion).toBe(version);
      expect(profile.awgProfileGenerated).toBe(true);
      expect(profile.privateKey).toBe('---default---');
      expect(InterfaceUpdateSchema.safeParse(profile).success).toBe(true);
      const defaults = await services.userConfigs.get();
      expect(defaults.host).toBe('');
      expect(defaults.defaultJC).toBe(profile.jC);
      expect(defaults.defaultContentPaddingAddition).toBe(
        profile.contentPaddingAddition
      );
      expect(defaults.defaultDisableCookies).toBe(profile.disableCookies);
      const created = await services.clients.create({
        name: 'Test',
        expiresAt: null,
      });
      const clientId = created[0]!.clientId;
      const client = (await services.clients.get(clientId))!;
      const exported = wg.generateClientConfig(profile, defaults, client, {
        enableIpv6: true,
      });
      expect(exported.includes('HeaderProtectionKey =')).toBe(
        version !== '2.0'
      );
      expect(exported.includes('RandomTrailers =')).toBe(version === '3.1');
      expect(client.contentPaddingAddition).toBe(
        defaults.defaultContentPaddingAddition
      );
      expect(client.disableCookies).toBe(defaults.defaultDisableCookies);
    }
  );
  test('restart preserves version, keys, parameters and defaults despite a newer module', async () => {
    detect.mockResolvedValue('3.0');
    await prepareAwgProfile(services, settings, detect);
    await services.interfaces.updateKeyPair(KEY, KEY);
    const before = await services.interfaces.get();
    const defaults = await services.userConfigs.get();
    // A rebuilt container creates new service instances over the same database.
    services.interfaces = new InterfaceService(db);
    const after = await prepareAwgProfile(services, settings, detect);
    expect(detect).toHaveBeenLastCalledWith('3.0');
    expect(after).toEqual(before);
    expect(await services.userConfigs.get()).toEqual(defaults);
  });
  test('profile survives a failed first key generation and is not regenerated', async () => {
    const before = await prepareAwgProfile(services, settings, detect);
    const after = await prepareAwgProfile(services, settings, detect);
    expect(after).toEqual(before);
  });
  test('default latest selects a version without enabling optional parameters', async () => {
    const before = await services.interfaces.get();
    const after = await prepareAwgProfile(
      services,
      { WG_EXECUTABLE: 'awg' },
      detect
    );
    expect(detect).toHaveBeenCalledWith('latest');
    expect(after.awgProtocolVersion).toBe('3.1');
    expect(after.awgProfileGenerated).toBe(false);
    expect(after.h1).toBe(before.h1);
    expect(after.headerProtectionKey).toBeNull();
  });
  test('existing unmanaged installations stay unchanged with no environment options', async () => {
    await services.interfaces.updateKeyPair(KEY, KEY);
    const before = await services.interfaces.get();
    expect(
      await prepareAwgProfile(services, { WG_EXECUTABLE: 'awg' }, detect)
    ).toEqual(before);
    expect(detect).not.toHaveBeenCalled();
  });
  test('generation rejects existing installations without modifying them', async () => {
    await services.interfaces.updateKeyPair(KEY, KEY);
    const before = await services.interfaces.get();
    const defaults = await services.userConfigs.get();
    await expect(prepareAwgProfile(services, settings, detect)).rejects.toThrow(
      'fresh configuration'
    );
    expect(detect).not.toHaveBeenCalled();
    expect(await services.interfaces.get()).toEqual(before);
    expect(await services.userConfigs.get()).toEqual(defaults);
  });
  test('generation also rejects existing clients with placeholder server keys', async () => {
    await services.clients.create({ name: 'Existing', expiresAt: null });
    await expect(prepareAwgProfile(services, settings, detect)).rejects.toThrow(
      'fresh configuration'
    );
    expect(detect).not.toHaveBeenCalled();
  });
  test('unsupported version and explicit version changes fail before modifying settings', async () => {
    const before = await services.interfaces.get();
    detect.mockRejectedValueOnce(new Error('unsupported module'));
    await expect(prepareAwgProfile(services, settings, detect)).rejects.toThrow(
      'unsupported module'
    );
    expect(await services.interfaces.get()).toEqual(before);
    await prepareAwgProfile(services, settings, detect);
    const saved = await services.interfaces.get();
    detect.mockClear();
    await expect(
      prepareAwgProfile(
        services,
        {
          ...settings,
          AWG_PROTOCOL_VERSION: '2.0',
          AWG_PROTOCOL_VERSION_SET: true,
        },
        detect
      )
    ).rejects.toThrow('requires migration');
    expect(detect).not.toHaveBeenCalled();
    expect(await services.interfaces.get()).toEqual(saved);
  });
  test('plain WireGuard rejects AWG options and otherwise preserves its database', async () => {
    const before = await services.interfaces.get();
    await expect(
      prepareAwgProfile(services, { ...settings, WG_EXECUTABLE: 'wg' }, detect)
    ).rejects.toThrow('EXPERIMENTAL_AWG');
    expect(
      await prepareAwgProfile(services, { WG_EXECUTABLE: 'wg' }, detect)
    ).toEqual(before);
    expect(detect).not.toHaveBeenCalled();
  });
  test('atomic generation rolls back client defaults if saving the interface fails', async () => {
    const before = await services.userConfigs.get();
    await db.run(
      sql`CREATE TRIGGER reject_profile BEFORE UPDATE ON interfaces_table BEGIN SELECT RAISE(ABORT, 'test failure'); END`
    );
    await expect(
      prepareAwgProfile(services, settings, detect)
    ).rejects.toThrow();
    expect(await services.userConfigs.get()).toEqual(before);
    expect((await services.interfaces.get()).awgProtocolVersion).toBeNull();
  });
  test('existing default and client settings are validated when selecting a version', async () => {
    await services.interfaces.updateKeyPair(KEY, KEY);
    await services.userConfigs.update({ defaultDisableCookies: false });
    detect.mockResolvedValue('3.0');
    const explicit = {
      WG_EXECUTABLE: 'awg',
      AWG_PROTOCOL_VERSION: '3.0' as const,
      AWG_PROTOCOL_VERSION_SET: true,
    };
    await expect(prepareAwgProfile(services, explicit, detect)).rejects.toThrow(
      'DisableCookies'
    );
    await services.clients.create({ name: 'Existing', expiresAt: null });
    await services.userConfigs.update({ defaultDisableCookies: null });
    await expect(prepareAwgProfile(services, explicit, detect)).rejects.toThrow(
      'DisableCookies'
    );
    expect((await services.interfaces.get()).awgProtocolVersion).toBeNull();
  });
  test('API updates reject unsupported parameters and cannot replace version metadata', async () => {
    detect.mockResolvedValue('2.0');
    const profile = await prepareAwgProfile(services, settings, detect);
    await expect(
      services.userConfigs.update({ defaultRekeyTimeout: '3-7' })
    ).rejects.toThrow('RekeyTimeout');
    const update = InterfaceUpdateSchema.parse(profile);
    await expect(
      services.interfaces.update({ ...update, randomTrailers: false })
    ).rejects.toThrow('RandomTrailers');
    await services.interfaces.update({
      ...update,
      awgProtocolVersion: '3.1',
      awgProfileGenerated: false,
    } as typeof update);
    expect((await services.interfaces.get()).awgProtocolVersion).toBe('2.0');
    expect((await services.interfaces.get()).awgProfileGenerated).toBe(true);
    const created = await services.clients.create({
      name: 'Test',
      expiresAt: null,
    });
    const clientId = created[0]!.clientId;
    const client = (await services.clients.get(clientId))!;
    const clientUpdate = ClientUpdateSchema.parse(client);
    await expect(
      services.clients.update(clientId!, {
        ...clientUpdate,
        disableCookies: false,
      })
    ).rejects.toThrow('DisableCookies');
  });
  test('generation validates profile data before writing either table', async () => {
    const invalid = generateAwgProfile('3.1');
    invalid.parameters.s1 = 0;
    const before = await services.userConfigs.get();
    await expect(
      services.interfaces.initializeAwgProfile('3.1', invalid)
    ).rejects.toThrow();
    expect(await services.userConfigs.get()).toEqual(before);
    expect((await services.interfaces.get()).awgProfileGenerated).toBe(false);
  });
});
