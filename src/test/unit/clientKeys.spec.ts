import fs from 'node:fs/promises';

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { requestEvent } from '../helpers/request';
import { databaseFixture } from '../helpers/database';

import * as clientOperations from '#server/features/vpn/clients';
import { UserConfigRepository } from '#db/repositories/userConfig/repository';
import { roles } from '#shared/utils/permissions';
import { importConfiguration } from '#server/features/setup';
import * as schema from '#db/schema';
import { ClientRepository } from '#db/repositories/client/repository';
import { ClientUpdateSchema } from '#shared/contracts/client';
import { UserConfigUpdateSchema } from '#shared/contracts/userConfig';
import removePreSharedKey from '#server/api/client/[clientId]/preSharedKey.delete';
import rotatePreSharedKey from '#server/api/client/[clientId]/preSharedKey.post';
import rotateKeyPair from '#server/api/client/[clientId]/rotateKeyPair.post';
import {
  generateClientConfig,
  generateServerConfig,
} from '#server/features/vpn/configuration';

const { getCurrentUser, exec } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  exec: vi.fn(),
}));

vi.mock('#server/features/identity/session', () => ({ getCurrentUser }));
vi.mock('#server/utils/cmd', () => ({ exec }));
vi.mock('#server/utils/config', () => ({
  OLD_ENV: {},
  WG_ENV: { WG_EXECUTABLE: 'wg', WG_INTERFACE: 'wg0', PORT: '51821' },
}));
const writeFile = vi.spyOn(fs, 'writeFile');

let clients: ClientRepository;
let store: Awaited<ReturnType<typeof databaseFixture>>['store'];
let db: Awaited<ReturnType<typeof databaseFixture>>['db'];

function event(clientId = '1') {
  const event = requestEvent(`http://localhost/api/client/${clientId}`);
  event.context.params = { clientId };
  return event;
}

beforeEach(async () => {
  vi.resetAllMocks();
  writeFile.mockResolvedValue();
  getCurrentUser.mockResolvedValue({ id: 1, role: 1 });
  exec.mockImplementation(async (command: string) => {
    if (command === 'wg genpsk') return 'new-preshared-key';
    if (command === 'wg genkey') return 'new-private-key';
    if (command === 'echo new-private-key | wg pubkey') return 'new-public-key';
    if (command === 'wg-quick down wg0; wg-quick up wg0') return '';
    if (command === 'wg show wg0 dump') return '';
    if (
      command.includes(' syncconf ') ||
      /^(?:while )?ip6?tables /.test(command)
    )
      return '';
    throw new Error(`Unexpected command: ${command}`);
  });

  ({ db, store } = await databaseFixture());
  await db.insert(schema.user).values({
    id: 1,
    username: 'admin',
    name: 'Admin',
    role: 1,
    totpVerified: false,
    enabled: true,
  });
  await db.update(schema.userConfig).set({ host: 'vpn.example.com' });
  await db.insert(schema.client).values(
    [1, 2].map((id) => ({
      id,
      userId: 1,
      interfaceId: 'wg0',
      name: `Client ${id}`,
      ipv4Address: `10.8.0.${id + 1}`,
      ipv6Address: `fdcc:ad94:bacf:61a4::cafe:${id + 1}`,
      privateKey: `private-key-${id}`,
      publicKey: `public-key-${id}`,
      preSharedKey: `preshared-key-${id}`,
      serverAllowedIps: [],
      persistentKeepalive: 0,
      enabled: true,
    }))
  );
  clients = new ClientRepository(db);
});

async function configurations(clientId = 1) {
  const client = (await clients.get(clientId))!;
  const wgInterface = (await db.select().from(schema.wgInterface))[0]!;
  const userConfig = (await db.select().from(schema.userConfig))[0]!;
  return {
    server: generateServerConfig(wgInterface, await store.hooks.get(), [
      client,
    ]),
    client: generateClientConfig(wgInterface, userConfig, client),
  };
}

describe('client key actions', () => {
  test.each([true, false])(
    'creates clients with preshared-key generation set to %s',
    async (defaultGeneratePreSharedKey) => {
      const userConfigs = new UserConfigRepository(db, 'wg0');
      const defaults = await userConfigs.get();
      expect(defaults.defaultGeneratePreSharedKey).toBe(true);
      const existing = await clients.getAll();
      await userConfigs.update(
        UserConfigUpdateSchema.parse({
          ...defaults,
          defaultGeneratePreSharedKey,
        })
      );
      expect((await userConfigs.get()).defaultGeneratePreSharedKey).toBe(
        defaultGeneratePreSharedKey
      );
      expect(await clients.getAll()).toEqual(existing);

      const clientId = await clientOperations.create(
        { id: 1, role: roles.ADMIN },
        {
          name: 'New client',
          expiresAt: null,
        }
      );
      expect(await clients.get(clientId)).toMatchObject({
        privateKey: 'new-private-key',
        publicKey: 'new-public-key',
        preSharedKey: defaultGeneratePreSharedKey ? 'new-preshared-key' : null,
      });
      expect(await clients.getPublic(clientId)).toMatchObject({
        hasPreSharedKey: defaultGeneratePreSharedKey,
      });
    }
  );

  test.each(['', null])(
    'normalizes an imported absent key (%s) to null',
    async (preSharedKey) => {
      await store.general.update({ setupStep: 3 });
      await importConfiguration(
        JSON.stringify({
          server: {
            privateKey: 'server-private',
            publicKey: 'server-public',
            address: '10.8.0.1',
          },
          clients: {
            imported: {
              name: 'Imported client',
              enabled: true,
              address: '10.8.0.4',
              privateKey: 'imported-private-key',
              publicKey: 'imported-public-key',
              preSharedKey,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
            },
          },
        })
      );
      expect(await clients.get(3)).toMatchObject({ preSharedKey: null });
      expect(await clients.getPublic(3)).toMatchObject({
        hasPreSharedKey: false,
      });
    }
  );

  test('removes only the selected preshared key and updates both configurations', async () => {
    const before = await clients.get(1);
    const other = await clients.get(2);
    expect(await clients.getPublic(1)).toMatchObject({ hasPreSharedKey: true });
    const original = await configurations();
    expect(original.client).toContain('PresharedKey = preshared-key-1\n');
    expect(original.server).toContain('PresharedKey = preshared-key-1\n');

    expect(await removePreSharedKey(event())).toEqual({ success: true });
    expect(await clients.get(1)).toEqual({
      ...before,
      preSharedKey: null,
      updatedAt: expect.any(String),
    });
    expect(await clients.get(2)).toEqual(other);
    expect(await clients.getPublic(1)).toMatchObject({
      hasPreSharedKey: false,
    });
    expect(writeFile).toHaveBeenCalledOnce();

    const updated = await configurations();
    expect(updated.client).not.toMatch(/^PresharedKey\s*=/m);
    // A zero key explicitly clears the active peer's key during syncconf.
    expect(updated.server).toContain(
      '\nPresharedKey = AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=\n'
    );

    expect(await removePreSharedKey(event())).toEqual({ success: true });
    expect(await configurations()).toEqual(updated);
  });

  test('rotates the pair together without changing the preshared key or other clients', async () => {
    const before = await clients.get(1);
    const other = await clients.get(2);
    expect(await rotateKeyPair(event())).toEqual({ success: true });
    expect(await clients.get(1)).toEqual({
      ...before,
      privateKey: 'new-private-key',
      publicKey: 'new-public-key',
      updatedAt: expect.any(String),
    });
    expect(await clients.get(2)).toEqual(other);
    expect(writeFile).toHaveBeenCalledOnce();
    expect(String(writeFile.mock.calls[0]?.[1])).toContain(
      'PublicKey = new-public-key'
    );
    expect(String(writeFile.mock.calls[0]?.[1])).not.toContain(
      'PublicKey = public-key-1'
    );
    expect(exec).toHaveBeenCalledWith('wg syncconf wg0 <(wg-quick strip wg0)');

    const publicClient = await clients.getPublic(1);
    expect(publicClient).toMatchObject({
      publicKey: 'new-public-key',
      hasPreSharedKey: true,
    });
    expect(publicClient).not.toHaveProperty('privateKey');
    expect(publicClient).not.toHaveProperty('preSharedKey');
    const updated = await configurations();
    expect(updated.client).toContain('\nPrivateKey = new-private-key\n');
    expect(updated.server).toContain('\nPublicKey = new-public-key\n');
  });

  test.each([null, 'preshared-key-1'])(
    'generates a preshared key when the previous key is %s',
    async (preSharedKey) => {
      await db
        .update(schema.client)
        .set({ preSharedKey })
        .where(eq(schema.client.id, 1));
      const before = await clients.get(1);
      const other = await clients.get(2);

      expect(await rotatePreSharedKey(event())).toEqual({ success: true });
      expect(await clients.get(1)).toEqual({
        ...before,
        preSharedKey: 'new-preshared-key',
        updatedAt: expect.any(String),
      });
      expect(await clients.get(2)).toEqual(other);
      expect(writeFile).toHaveBeenCalledOnce();

      const publicClient = await clients.getPublic(1);
      expect(publicClient).toMatchObject({ hasPreSharedKey: true });
      expect(publicClient).not.toHaveProperty('preSharedKey');
      const updated = await configurations();
      expect(updated.client).toContain('\nPresharedKey = new-preshared-key\n');
      expect(updated.server).toContain('\nPresharedKey = new-preshared-key\n');
    }
  );

  test('preserves the preshared key when generation fails or returns an empty key', async () => {
    const before = await clients.get(1);
    exec.mockRejectedValueOnce(new Error('Key generation failed'));

    await expect(rotatePreSharedKey(event())).rejects.toThrow(
      'Key generation failed'
    );
    expect(await clients.get(1)).toEqual(before);
    expect(writeFile).not.toHaveBeenCalled();

    exec.mockResolvedValueOnce('');
    await expect(rotatePreSharedKey(event())).rejects.toThrow(
      'Failed to generate preshared key'
    );
    expect(await clients.get(1)).toEqual(before);
    expect(writeFile).not.toHaveBeenCalled();
  });

  test.each(['wg genkey', 'echo new-private-key | wg pubkey'])(
    'preserves the current pair when %s fails',
    async (failedCommand) => {
      const before = await clients.get(1);
      exec.mockImplementation(async (command: string) => {
        if (command === failedCommand) throw new Error('Key generation failed');
        return 'new-private-key';
      });
      await expect(rotateKeyPair(event())).rejects.toThrow(
        'Key generation failed'
      );
      expect(await clients.get(1)).toEqual(before);
      expect(writeFile).not.toHaveBeenCalled();
    }
  );

  test('editing client details preserves the current keys', async () => {
    const stale = await clients.get(1);
    await removePreSharedKey(event());
    await rotateKeyPair(event());
    await clients.update(
      1,
      ClientUpdateSchema.parse({ ...stale, name: 'Renamed' })
    );
    expect(await clients.get(1)).toMatchObject({
      name: 'Renamed',
      privateKey: 'new-private-key',
      publicKey: 'new-public-key',
      preSharedKey: null,
    });
  });

  describe.each([
    ['remove preshared key', removePreSharedKey],
    ['rotate preshared key', rotatePreSharedKey],
    ['rotate key pair', rotateKeyPair],
  ] as const)('%s authorization', (_name, action) => {
    test('allows the client owner', async () => {
      getCurrentUser.mockResolvedValue({ id: 1, role: 2 });
      expect(await action(event())).toEqual({ success: true });
      expect(writeFile).toHaveBeenCalledOnce();
    });

    test('rejects a different owner without modifying keys', async () => {
      const before = await clients.get(1);
      getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
      await expect(action(event())).rejects.toMatchObject({ status: 403 });
      expect(await clients.get(1)).toEqual(before);
      expect(exec).not.toHaveBeenCalled();
      expect(writeFile).not.toHaveBeenCalled();
    });

    test('reports a missing client without generating keys or syncing', async () => {
      await expect(action(event('999'))).rejects.toMatchObject({
        status: 404,
      });
      expect(exec).not.toHaveBeenCalled();
      expect(writeFile).not.toHaveBeenCalled();
    });
  });
});
