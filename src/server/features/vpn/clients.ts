import { createError } from 'nuxt/server';
import { parseCidr } from 'cidr-tools';

import { commit, unchanged } from './lifecycle';
import {
  authorize,
  authorizeClient,
  assertClientAddresses,
  assertClientEnabled,
  isExpired,
  type Actor,
} from './policies';

import { wg } from '#server/utils/wgHelper';
import type { Repositories } from '#db/store';
import type {
  ClientBulkType,
  ClientCreateType,
  ClientKeyModeChange,
  UpdateClientType,
} from '#shared/contracts/client';
import type { UserConfigType } from '#db/repositories/userConfig/types';
import { nextIP } from '#server/utils/ip';

type ClientAction =
  | ClientBulkType['action']
  | 'rotateKeyPair'
  | 'rotatePreSharedKey'
  | 'removePreSharedKey';

async function clientForUpdate(
  tx: Repositories,
  actor: Actor,
  clientId: number
) {
  return authorizeClient(actor, 'update', await tx.clients.getPublic(clientId));
}

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

async function deviceKeys(
  tx: Repositories,
  network: { name: string; publicKey: string },
  publicKey: string,
  clientId?: number
) {
  if (network.publicKey === publicKey) {
    throw createError({
      status: 422,
      message: 'The interface already uses this public key.',
    });
  }
  if (await tx.clients.hasPublicKey(network.name, publicKey, clientId)) {
    throw createError({
      status: 409,
      message: 'Another client already uses this public key.',
    });
  }
  return { publicKey, privateKey: null };
}

export async function create(actor: Actor, data: ClientCreateType) {
  authorize(actor, 'clients', 'create');
  return commit(async (tx) => {
    assertClientEnabled(true, data.expiresAt);
    const network = await tx.interfaces.get();
    const keys = data.publicKey
      ? await deviceKeys(tx, network, data.publicKey)
      : await wg.generateKeyPair();
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
      ...keys,
      preSharedKey: preSharedKey || null,
      ipv4Address: nextIP(parseCidr(network.ipv4Cidr), clients),
      ipv6Address: nextIP(parseCidr(network.ipv6Cidr), clients),
      enabled: true,
    });
    return created!.clientId;
  });
}

export async function replacePublicKey(
  actor: Actor,
  clientId: number,
  publicKey: string
) {
  await commit(async (tx) => {
    const client = await clientForUpdate(tx, actor, clientId);
    if (client.hasPrivateKey) {
      throw createError({
        status: 409,
        message: 'Use Rotate Key Pair for this client.',
      });
    }
    if (client.publicKey === publicKey) {
      return unchanged;
    }
    const keys = await deviceKeys(tx, await tx.interfaces.get(), publicKey);
    await tx.clients.update(clientId, keys);
  });
}

export function setKeyMode(
  actor: Actor,
  clientId: number,
  change: ClientKeyModeChange
) {
  return commit(async (tx) => {
    const client = await clientForUpdate(tx, actor, clientId);
    const alreadyInMode = client.hasPrivateKey === (change.mode === 'managed');
    if (
      alreadyInMode &&
      (change.mode === 'managed' || change.publicKey === client.publicKey)
    ) {
      return unchanged;
    }
    if (alreadyInMode || change.currentPublicKey !== client.publicKey) {
      throw createError({
        status: 409,
        message: 'The client keys have changed. Refresh and try again.',
      });
    }
    const keys =
      change.mode === 'managed'
        ? await wg.generateKeyPair()
        : await deviceKeys(
            tx,
            await tx.interfaces.get(),
            change.publicKey,
            clientId
          );
    await tx.clients.update(clientId, keys);
    await tx.oneTimeLinks.delete(clientId);
  });
}

export async function update(
  actor: Actor,
  clientId: number,
  data: UpdateClientType
) {
  await commit(async (tx) => {
    await clientForUpdate(tx, actor, clientId);
    // TODO: Require admin approval for changes to serverAllowedIps because they affect host routing.
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

  await commit(async (tx) => {
    const client = await clientForUpdate(tx, actor, clientId);
    if (action === 'rotateKeyPair') {
      if (!client.hasPrivateKey) {
        throw createError({
          status: 409,
          message:
            'Generate a key pair on the device and replace its public key.',
        });
      }
      await tx.clients.update(clientId, await wg.generateKeyPair());
      return;
    }
    const preSharedKey =
      action === 'rotatePreSharedKey' ? await wg.generatePreSharedKey() : null;
    if (preSharedKey === '') {
      throw new Error('Failed to generate preshared key');
    }
    await tx.clients.update(clientId, { preSharedKey });
  });
}

export function bulk(actor: Actor, data: ClientBulkType) {
  return changeAccess(actor, data, false);
}

function changeAccess(actor: Actor, data: ClientBulkType, single: boolean) {
  return commit(async (tx) => {
    const clients = await tx.clients.findByIds(data.clientIds);
    const permission = data.action === 'delete' ? 'delete' : 'update';
    if (single) {
      authorizeClient(actor, permission, clients[0]);
    } else {
      for (const client of clients) {
        authorize(actor, 'clients', permission, client);
      }
    }
    if (clients.length !== data.clientIds.length) {
      throw createError({
        status: 404,
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
        status: 422,
        message,
        statusText: single ? message : undefined,
      });
    }
    if (data.action === 'delete') {
      await tx.clients.deleteMany(data.clientIds);
    } else {
      await tx.clients.setEnabled(data.clientIds, data.action === 'enable');
    }
    return clients.length;
  });
}
