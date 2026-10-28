import { createError } from 'nuxt/server';
import CRC32 from 'crc-32';

import { authorizeClient, isExpired, type Actor } from './policies';
import { generateClientConfig } from './configuration';

import { WG_ENV } from '#server/utils/config';
import { getDatabase } from '#db';
import type { Repositories } from '#db/store';

function filename(name: string, id: number) {
  const clean = name
    .replace(/[^a-zA-Z0-9_=+.-]/g, '-')
    .replace(/(-{2,}|-$)/g, '-')
    .replace(/-$/, '')
    .substring(0, 32);
  return `${clean || id}.conf`;
}

async function configuration(
  tx: Repositories,
  client: NonNullable<Awaited<ReturnType<Repositories['clients']['get']>>>
) {
  const network = await tx.interfaces.get();
  const defaults = await tx.userConfigs.get();
  return {
    filename: filename(client.name, client.id),
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
    authorizeClient(actor, 'update', await tx.clients.getPublic(clientId));
    // Preserve the existing short-link format and five-minute lifetime.
    const key = `${clientId}-${Math.floor(Math.random() * 1000)}`;
    const token = Math.abs(CRC32.str(key)).toString(16);
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
    if (!link)
      throw createError({
        status: 404,
        statusText: 'Invalid One Time Link',
      });
    if (isExpired(link.expiresAt, Date.now()))
      throw createError({
        status: 410,
        statusText: 'One Time Link has expired',
      });
    const client = await tx.clients.get(link.id);
    if (!client)
      throw createError({
        status: 404,
        statusText: 'Invalid One Time Link',
      });
    const result = await configuration(tx, client);
    // Keep the existing grace period for browsers that request twice.
    await tx.oneTimeLinks.setExpiry(
      link.id,
      new Date(Date.now() + 10 * 1000).toISOString()
    );
    return result;
  });
}
