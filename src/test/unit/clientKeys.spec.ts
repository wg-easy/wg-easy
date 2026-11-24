import fs from 'node:fs/promises';

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { requestEvent } from '../helpers/request';
import { databaseFixture } from '../helpers/database';

import * as clientOperations from '#server/features/vpn/clients';
import { roles } from '#shared/utils/permissions';
import * as schema from '#db/schema';
import { ClientUpdateSchema } from '#shared/contracts/client';
import { UserConfigUpdateSchema } from '#shared/contracts/userConfig';
import removePreSharedKey from '#server/api/client/[clientId]/preSharedKey.delete';
import rotatePreSharedKey from '#server/api/client/[clientId]/preSharedKey.post';
import rotateKeyPair from '#server/api/client/[clientId]/rotateKeyPair.post';
import createClient from '#server/api/client/index.post';
import replacePublicKey from '#server/api/client/[clientId]/publicKey.put';
import setKeyMode from '#server/api/client/[clientId]/keyMode.put';
import qrCode from '#server/api/client/[clientId]/qrcode.svg.get';
import * as provisioning from '#server/features/vpn/provisioning';
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
vi.mock('#server/http/translation', () => ({
  useRequestTranslation: () => (key: string) => key,
}));
vi.mock('#server/utils/config', () => ({
  OLD_ENV: {},
  WG_ENV: { WG_EXECUTABLE: 'wg', WG_INTERFACE: 'wg0', PORT: '51821' },
}));
const writeFile = vi.spyOn(fs, 'writeFile');

let store: Awaited<ReturnType<typeof databaseFixture>>['store'];
let clients: typeof store.clients;
let db: Awaited<ReturnType<typeof databaseFixture>>['db'];
const owner = { id: 1, role: roles.CLIENT };

function event(clientId = '1', body?: Record<string, unknown>) {
  const event = requestEvent(
    `http://localhost/api/client/${clientId}`,
    body === undefined
      ? undefined
      : {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }
  );
  event.context.params = { clientId };
  return event;
}

beforeEach(async () => {
  vi.resetAllMocks();
  writeFile.mockResolvedValue();
  getCurrentUser.mockResolvedValue({ id: 1, role: 1 });
  exec.mockImplementation(async (command: string) => {
    if (command.includes('route show table all match')) {
      const dst = command.startsWith('ip -4')
        ? '10.8.0.0/24'
        : 'fdcc:ad94:bacf:61a4::/64';
      return JSON.stringify([{ dst, dev: 'wg0', protocol: 'kernel' }]);
    }
    if (command === 'wg genpsk') {
      return 'new-preshared-key';
    }
    if (command === 'wg genkey') {
      return 'new-private-key';
    }
    if (command === 'echo new-private-key | wg pubkey') {
      return 'new-public-key';
    }
    if (command === 'wg show wg0 fwmark' || command === 'wg show wg0 dump') {
      return '';
    }
    if (
      command.includes(' syncconf ') ||
      /^(?:while )?ip6?tables /.test(command)
    ) {
      return '';
    }
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
  clients = store.clients;
});

async function configurations(clientId = 1) {
  const client = (await clients.get(clientId))!;
  const wgInterface = await store.interfaces.get();
  const userConfig = await store.userConfigs.get();
  return {
    server: generateServerConfig(wgInterface, await store.hooks.get(), [
      client,
    ]),
    client: generateClientConfig(wgInterface, userConfig, client),
  };
}

async function issueLink(clientId = 1) {
  await provisioning.generateOneTimeLink(owner, clientId);
  const link = await db.query.oneTimeLink.findFirst({
    where: eq(schema.oneTimeLink.id, clientId),
  });
  const token = link!.oneTimeLink;
  expect(token).toMatch(/^[A-Za-z0-9]{8}$/);
  return token;
}

describe('device-held private keys', () => {
  const admin = { id: 1, role: roles.ADMIN };
  const firstKey = Buffer.alloc(32, 1).toString('base64');
  const nextKey = Buffer.alloc(32, 2).toString('base64');

  function register(publicKey: string) {
    return createClient(
      requestEvent('http://localhost/api/client', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Router', expiresAt: null, publicKey }),
      })
    );
  }

  function replace(
    clientId: number,
    currentPublicKey: string,
    publicKey: string
  ) {
    return replacePublicKey(
      event(String(clientId), { currentPublicKey, publicKey })
    );
  }

  test.each([true, false])(
    'registers a public key with preshared-key generation %s',
    async (generate) => {
      await store.userConfigs.update({ defaultGeneratePreSharedKey: generate });
      const { clientId } = await register(`  ${firstKey}\n`);
      expect(exec).not.toHaveBeenCalledWith('wg genkey');
      expect(await clients.get(clientId)).toMatchObject({
        privateKey: null,
        publicKey: firstKey,
        preSharedKey: generate ? 'new-preshared-key' : null,
      });
      const page = await clients.getPage({ page: 1, pageSize: 25 });
      expect(
        page.clients.find((client) => client.id === clientId)
      ).toMatchObject({ hasPrivateKey: false });
      expect(await clients.getPublic(1)).toMatchObject({ hasPrivateKey: true });
      const download = await provisioning.download(admin, clientId);
      expect(download.filename).toBe('Router.template.conf');
      expect(download.contents).toContain('# PrivateKey =');
      expect(download.contents).not.toMatch(/^PrivateKey =/m);
      expect(
        download.contents.includes('PresharedKey = new-preshared-key')
      ).toBe(generate);
      expect(String(writeFile.mock.calls[0]?.[1])).toContain(
        `PublicKey = ${firstKey}`
      );
      const token = await issueLink(clientId);
      expect(await provisioning.redeemOneTimeLink(token)).toEqual(download);
      await expect(qrCode(event(String(clientId)))).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining('configuration template'),
      });
    }
  );

  test('a blank public key selects automatic key generation', async () => {
    const { clientId } = await register('  ');
    expect(await clients.get(clientId)).toMatchObject({
      privateKey: 'new-private-key',
      publicKey: 'new-public-key',
    });
  });

  test('an owner can replace a public key and retry without changing other settings or synchronizing twice', async () => {
    const { clientId } = await register(firstKey);
    const before = await clients.get(clientId);
    getCurrentUser.mockResolvedValue({ id: 1, role: 2 });
    writeFile.mockClear();
    await replace(clientId, firstKey, ` ${nextKey} `);
    expect(await clients.get(clientId)).toEqual({
      ...before,
      publicKey: nextKey,
      updatedAt: expect.any(String),
    });
    const config = String(writeFile.mock.calls[0]?.[1]);
    expect(config).toContain(nextKey);
    expect(config).not.toContain(firstKey);
    await replace(clientId, firstKey, nextKey);
    await expect(replace(clientId, firstKey, firstKey)).rejects.toMatchObject({
      status: 409,
    });
    expect(writeFile).toHaveBeenCalledOnce();
    await expect(rotateKeyPair(event(String(clientId)))).rejects.toMatchObject({
      status: 409,
    });
    await expect(replace(1, 'public-key-1', firstKey)).rejects.toMatchObject({
      status: 409,
    });
    getCurrentUser.mockResolvedValue({ id: 2, role: 2 });
    await expect(replace(clientId, nextKey, firstKey)).rejects.toMatchObject({
      status: 403,
    });
    expect((await clients.get(clientId))?.publicKey).toBe(nextKey);
    expect(writeFile).toHaveBeenCalledOnce();
  });

  test('creation and replacement reject invalid or conflicting keys before applying changes', async () => {
    const { clientId } = await register(firstKey);
    const serverKey = Buffer.alloc(32, 3).toString('base64');
    await store.interfaces.update({ publicKey: serverKey });
    await clients.update(2, { publicKey: nextKey, enabled: false });
    writeFile.mockClear();
    for (const [key, status] of [
      ['bad', 400],
      [Buffer.alloc(32).toString('base64'), 400],
      [firstKey.slice(0, -2) + 'B=', 400],
      [serverKey, 422],
      [nextKey, 409],
    ] as const) {
      await expect(register(key)).rejects.toMatchObject({ status });
      await expect(replace(clientId, firstKey, key)).rejects.toMatchObject({
        status,
      });
    }
    await expect(replace(clientId, firstKey, ' ')).rejects.toMatchObject({
      status: 400,
    });
    expect(await clients.getAll()).toHaveLength(3);
    expect((await clients.get(clientId))?.publicKey).toBe(firstKey);
    expect(writeFile).not.toHaveBeenCalled();
  });
});

describe('converting client keys', () => {
  const original = Buffer.alloc(32, 1).toString('base64');
  const replacement = Buffer.alloc(32, 2).toString('base64');

  test.each([original, replacement])(
    'converts a disabled client in place using device public key %s',
    async (publicKey) => {
      getCurrentUser.mockResolvedValue(owner);
      await clients.update(1, { publicKey: original, enabled: false });
      const before = await clients.get(1);
      const managedLink = await issueLink();
      const useDevice = () =>
        setKeyMode(
          event('1', {
            mode: 'device',
            currentPublicKey: original,
            publicKey: ` ${publicKey} `,
          })
        );
      await useDevice();
      expect(await clients.get(1)).toEqual({
        ...before,
        privateKey: null,
        publicKey,
        updatedAt: expect.any(String),
      });
      await expect(
        provisioning.redeemOneTimeLink(managedLink)
      ).rejects.toMatchObject({ status: 404 });
      const templateLink = await issueLink();
      await expect(
        provisioning.redeemOneTimeLink(managedLink)
      ).rejects.toMatchObject({ status: 404 });
      await useDevice();
      expect(await provisioning.redeemOneTimeLink(templateLink)).toMatchObject({
        isTemplate: true,
      });

      const useManaged = () =>
        setKeyMode(
          event('1', { mode: 'managed', currentPublicKey: publicKey })
        );
      await Promise.all([useManaged(), useManaged()]);
      expect(await clients.get(1)).toEqual({
        ...before,
        privateKey: 'new-private-key',
        publicKey: 'new-public-key',
        updatedAt: expect.any(String),
      });
      await expect(
        provisioning.redeemOneTimeLink(templateLink)
      ).rejects.toMatchObject({ status: 404 });
      const freshLink = await issueLink();
      await expect(
        provisioning.redeemOneTimeLink(templateLink)
      ).rejects.toMatchObject({ status: 404 });
      expect(await provisioning.redeemOneTimeLink(freshLink)).toMatchObject({
        isTemplate: false,
      });
      exec.mockClear();
      await useManaged();
      expect(exec).not.toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalledTimes(2);
    }
  );

  test('rejects unauthorized, stale and invalid conversions without changing keys or links', async () => {
    await clients.update(1, { publicKey: original });
    await clients.update(2, { publicKey: replacement, enabled: false });
    const before = await clients.get(1);
    const token = await issueLink();
    const useDevice = (currentPublicKey: string, publicKey: string) =>
      setKeyMode(event('1', { mode: 'device', currentPublicKey, publicKey }));
    getCurrentUser.mockResolvedValue({ id: 2, role: roles.CLIENT });
    await expect(useDevice(original, original)).rejects.toMatchObject({
      status: 403,
    });
    getCurrentUser.mockResolvedValue(owner);
    await expect(useDevice(replacement, original)).rejects.toMatchObject({
      status: 409,
    });
    await expect(useDevice(original, replacement)).rejects.toMatchObject({
      status: 409,
    });
    await expect(useDevice(original, ' ')).rejects.toMatchObject({
      status: 400,
    });
    expect(await clients.get(1)).toEqual(before);
    expect(await provisioning.redeemOneTimeLink(token)).toMatchObject({
      isTemplate: false,
    });
    expect(writeFile).not.toHaveBeenCalled();
  });

  test('a failed key generation preserves the device key and its template link', async () => {
    await clients.update(1, { publicKey: original, privateKey: null });
    const before = await clients.get(1);
    const token = await issueLink();
    exec.mockRejectedValueOnce(new Error('Failed to generate key'));
    await expect(
      setKeyMode(event('1', { mode: 'managed', currentPublicKey: original }))
    ).rejects.toThrow('Failed to generate key');
    expect(await clients.get(1)).toEqual(before);
    expect(await provisioning.redeemOneTimeLink(token)).toMatchObject({
      isTemplate: true,
    });
  });
});

describe('client key actions', () => {
  test.each(['create', 'rotate', 'convert'] as const)(
    'allows other client updates while %s is generating a key pair',
    async (operation) => {
      const original = Buffer.alloc(32, 1).toString('base64');
      await clients.update(1, {
        publicKey: original,
        privateKey: operation === 'convert' ? null : 'private-key-1',
      });
      const entered = Promise.withResolvers<undefined>();
      const generation = Promise.withResolvers<string>();
      exec.mockImplementationOnce(() => {
        entered.resolve(undefined);
        return generation.promise;
      });
      const pending = {
        create: () =>
          clientOperations.create(
            { id: 1, role: roles.ADMIN },
            { name: 'Laptop', expiresAt: null }
          ),
        rotate: () => rotateKeyPair(event()),
        convert: () =>
          setKeyMode(
            event('1', { mode: 'managed', currentPublicKey: original })
          ),
      }[operation]();
      await entered.promise;
      const disable = clientOperations.apply(owner, 2, 'disable');
      try {
        await vi.waitFor(() => expect(writeFile).toHaveBeenCalledOnce());
        await disable;
        expect((await clients.get(2))?.enabled).toBe(false);
      } finally {
        generation.resolve('new-private-key');
        await Promise.all([pending, disable]);
      }
    }
  );

  test('discards a generated key pair if the device key changed during conversion', async () => {
    const original = Buffer.alloc(32, 1).toString('base64');
    const replacement = Buffer.alloc(32, 2).toString('base64');
    await clients.update(1, { publicKey: original, privateKey: null });
    const link = await issueLink();
    exec.mockImplementationOnce(async () => {
      await clientOperations.replacePublicKey(owner, 1, {
        currentPublicKey: original,
        publicKey: replacement,
      });
      return 'new-private-key';
    });
    await expect(
      setKeyMode(event('1', { mode: 'managed', currentPublicKey: original }))
    ).rejects.toMatchObject({ status: 409 });
    expect(await clients.get(1)).toMatchObject({
      publicKey: replacement,
      privateKey: null,
    });
    expect(await provisioning.redeemOneTimeLink(link)).toMatchObject({
      isTemplate: true,
    });
    expect(writeFile).toHaveBeenCalledOnce();
  });

  test.each([true, false])(
    'creates clients with preshared-key generation set to %s',
    async (defaultGeneratePreSharedKey) => {
      const { userConfigs } = store;
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
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining('wg syncconf wg0 '),
      expect.objectContaining({ input: expect.any(String) })
    );

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
        if (command === failedCommand) {
          throw new Error('Key generation failed');
        }
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
