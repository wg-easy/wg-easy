import { randomBytes } from 'node:crypto';

import { createError } from 'nuxt/server';

import { authorizeClient, isExpired, type Actor } from './policies';
import { generateClientConfig } from './configuration';

import { WG_ENV } from '#server/utils/config';
import { getDatabase } from '#db';
import type { ClientType } from '#db/repositories/client/types';
import type { Repositories } from '#db/store';

function filename(name: string, id: number, template: boolean) {
  const clean = name
    .replace(/[^a-zA-Z0-9_=+.-]/g, '-')
    .replace(/(-{2,}|-$)/g, '-')
    .replace(/-$/, '')
    .substring(0, 32);
  return `${clean || id}${template ? '.template' : ''}.conf`;
}

async function configuration(tx: Repositories, client: ClientType) {
  const network = await tx.interfaces.get();
  const defaults = await tx.userConfigs.get();
  const isTemplate = !client.privateKey;
  return {
    filename: filename(client.name, client.id, isTemplate),
    isTemplate,
    contents: generateClientConfig(network, defaults, client, {
      enableIpv6: !WG_ENV.DISABLE_IPV6,
      amnezia: WG_ENV.WG_EXECUTABLE === 'awg',
    }),
  };
}

export function download(actor: Actor, clientId: number) {
  return getDatabase().transaction(async (tx) => {
    const client = authorizeClient(
      actor,
      'view',
      await tx.clients.get(clientId)
    );
    return configuration(tx, client);
  });
}

export function generateOneTimeLink(actor: Actor, clientId: number) {
  return getDatabase().transaction(async (tx) => {
    const client = authorizeClient(
      actor,
      'update',
      await tx.clients.getPublic(clientId)
    );
    // A template URL must never be reissued as a private-key download.
    const prefix = client.hasPrivateKey ? 'm' : 't';
    const token = prefix + randomBytes(6).toString('base64url');
    await tx.oneTimeLinks.save(
      clientId,
      token,
      new Date(Date.now() + 5 * 60 * 1000).toISOString()
    );
  });
}

export function redeemOneTimeLink(token: string) {
  return getDatabase().transaction(async (tx) => {
    const link = await tx.oneTimeLinks.getByToken(token);
    if (!link) {
      throw createError({
        status: 404,
        statusText: 'Invalid One Time Link',
      });
    }
    const now = Date.now();
    if (isExpired(link.expiresAt, now)) {
      throw createError({
        status: 410,
        statusText: 'One Time Link has expired',
      });
    }
    const client = await tx.clients.get(link.id);
    if (!client) {
      throw createError({
        status: 404,
        statusText: 'Invalid One Time Link',
      });
    }
    const result = await configuration(tx, client);
    // Downloads may shorten the lifetime, but must never extend it.
    const expiresAt = Math.min(Date.parse(link.expiresAt), now + 10_000);
    await tx.oneTimeLinks.setExpiry(link.id, new Date(expiresAt).toISOString());
    return result;
  });
}
