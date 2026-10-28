import { createError } from 'h3';
import { parseCidr } from 'cidr-tools';

import { commit } from './lifecycle';
import {
  authorize,
  authorizeClient,
  assertClientAddresses,
  assertClientEnabled,
  isExpired,
  type Actor,
} from './policies';

import { wg } from '#server/utils/wgHelper';
import { getDatabase } from '#db';
import type {
  ClientBulkType,
  ClientCreateType,
  UpdateClientType,
} from '#shared/contracts/client';
import type { UserConfigType } from '#db/repositories/userConfig/types';
import { nextIP } from '#server/utils/ip';

type ClientAction =
  | ClientBulkType['action']
  | 'rotateKeyPair'
  | 'rotatePreSharedKey'
  | 'removePreSharedKey';

export function clientDefaults(config: UserConfigType) {
  return {
    mtu: config.defaultMtu,
    jC: config.defaultJC,
    jMin: config.defaultJMin,
    jMax: config.defaultJMax,
    i1: config.defaultI1,
    i2: config.defaultI2,
    i3: config.defaultI3,
    i4: config.defaultI4,
    i5: config.defaultI5,
    persistentKeepalive: config.defaultPersistentKeepalive,
    serverAllowedIps: [] as string[],
  };
}

export async function create(actor: Actor, data: ClientCreateType) {
  authorize(actor, 'clients', 'create');
  const privateKey = await wg.generatePrivateKey();
  const publicKey = await wg.getPublicKey(privateKey);
  return commit(async (tx) => {
    assertClientEnabled(true, data.expiresAt);
    const network = await tx.interfaces.get();
    const config = await tx.userConfigs.get();
    const clients = await tx.clients.getAll();
    const preSharedKey = config.defaultGeneratePreSharedKey
      ? await wg.generatePreSharedKey()
      : null;
    const [created] = await tx.clients.insert({
      ...clientDefaults(config),
      ...data,
      // Preserve existing ownership until user assignment is introduced.
      userId: 1,
      interfaceId: network.name,
      privateKey,
      publicKey,
      preSharedKey: preSharedKey || null,
      ipv4Address: nextIP(parseCidr(network.ipv4Cidr), clients),
      ipv6Address: nextIP(parseCidr(network.ipv6Cidr), clients),
      enabled: true,
    });
    return created!.clientId;
  });
}

export async function update(
  actor: Actor,
  clientId: number,
  data: UpdateClientType
) {
  await commit(async (tx) => {
    authorizeClient(actor, 'update', await tx.clients.getPublic(clientId));
    assertClientEnabled(data.enabled, data.expiresAt);
    const addresses = assertClientAddresses(
      data,
      await tx.interfaces.get(),
      (await tx.clients.getAll()).filter((client) => client.id !== clientId)
    );
    await tx.clients.update(clientId, { ...data, ...addresses });
  });
}

export async function apply(
  actor: Actor,
  clientId: number,
  action: ClientAction
) {
  if (action === 'enable' || action === 'disable' || action === 'delete') {
    await changeAccess(actor, { action, clientIds: [clientId] }, true);
    return;
  }

  // Authorize before generating secrets, then recheck in the write transaction.
  authorizeClient(
    actor,
    'update',
    await getDatabase().clients.getPublic(clientId)
  );
  let keys:
    { privateKey: string; publicKey: string } | { preSharedKey: string | null };
  if (action === 'rotateKeyPair') {
    const privateKey = await wg.generatePrivateKey();
    keys = { privateKey, publicKey: await wg.getPublicKey(privateKey) };
  } else if (action === 'rotatePreSharedKey') {
    const preSharedKey = await wg.generatePreSharedKey();
    if (!preSharedKey) throw new Error('Failed to generate preshared key');
    keys = { preSharedKey };
  } else {
    keys = { preSharedKey: null };
  }
  await commit(async (tx) => {
    authorizeClient(actor, 'update', await tx.clients.getPublic(clientId));
    await tx.clients.update(clientId, keys);
  });
}

export function bulk(actor: Actor, data: ClientBulkType) {
  return changeAccess(actor, data, false);
}

function changeAccess(actor: Actor, data: ClientBulkType, single: boolean) {
  return commit(async (tx) => {
    const clients = await tx.clients.findByIds(data.clientIds);
    const permission = data.action === 'delete' ? 'delete' : 'update';
    if (single) authorizeClient(actor, permission, clients[0]);
    else
      for (const client of clients)
        authorize(actor, 'clients', permission, client);
    if (clients.length !== data.clientIds.length) {
      throw createError({
        statusCode: 404,
        message:
          'Some selected clients no longer exist. Refresh and try again.',
      });
    }
    const now = Date.now();
    if (
      data.action === 'enable' &&
      clients.some((client) => isExpired(client.expiresAt, now))
    ) {
      const message = single
        ? 'Client is expired. Please update the expiration date first.'
        : 'Some selected clients are expired. Update their expiration dates before enabling them.';
      throw createError({
        statusCode: 422,
        message,
        statusMessage: single ? message : undefined,
      });
    }
    if (data.action === 'delete') await tx.clients.deleteMany(data.clientIds);
    else await tx.clients.setEnabled(data.clientIds, data.action === 'enable');
    return clients.length;
  });
}
