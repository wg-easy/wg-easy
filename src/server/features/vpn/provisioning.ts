import { randomInt } from 'node:crypto';

import { createError } from 'nuxt/server';

import { authorizeClient, isExpired, type Actor } from './policies';
import { generateClientConfig } from './configuration';

import { WG_ENV } from '#server/utils/config';
import { getDatabase } from '#db';
import type { ClientType } from '#db/repositories/client/types';
import type { Repositories } from '#db/store';

const tokenAlphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function cleanName(name: string, disallowed: RegExp) {
  const clean = name
    .replace(disallowed, '-')
    .replace(/(-{2,}|-$)/g, '-')
    .replace(/-$/, '');
  // Slice by code point so multi-unit characters are never split.
  return Array.from(clean).slice(0, 32).join('');
}

export function filenames(name: string, id: number, template: boolean) {
  const suffix = `${template ? '.template' : ''}.conf`;
  // Kept ASCII-only and unchanged: it is the `filename` fallback and stays
  // usable as a wg-quick interface name.
  const ascii = cleanName(name, /[^a-zA-Z0-9_=+.-]/g);
  const unicode = cleanName(name.normalize('NFC'), /[^\p{L}\p{M}\p{N}_=+.-]/gu);
  return {
    filename: `${ascii || id}${suffix}`,
    // Only set when it differs, so ASCII names keep the exact same header.
    unicodeFilename:
      unicode && unicode !== ascii ? `${unicode}${suffix}` : undefined,
  };
}

async function configuration(tx: Repositories, client: ClientType) {
  const network = await tx.interfaces.get();
  const defaults = await tx.userConfigs.get();
  const isTemplate = !client.privateKey;
  return {
    ...filenames(client.name, client.id, isTemplate),
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
    authorizeClient(actor, 'update', await tx.clients.getPublic(clientId));
    const token = Array.from(
      { length: 8 },
      () => tokenAlphabet[randomInt(tokenAlphabet.length)]
    ).join('');
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
