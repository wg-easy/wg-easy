import { createPrivateKey, createPublicKey } from 'node:crypto';

import { parseCidr } from 'cidr-tools';
import { createError } from 'nuxt/server';
import { z } from 'zod';

import type { Repositories } from '#db/store';
import { changeCidr } from '#server/features/vpn/interface';
import { clientDefaults } from '#server/features/vpn/clients';
import {
  isClientAddress,
  nextIPFromUsedAddresses,
  normalizeAddress,
} from '#server/utils/ip';
import { KeySchema } from '#shared/contracts/validation';
import { ClientUpdateSchema } from '#shared/contracts/client';
import { zeroWireGuardKey } from '#shared/utils/wireguard';

const key = KeySchema.unwrap();
const optionalClientKey = KeySchema.or(z.literal(''))
  .default(null)
  .transform((value) => value || null);
const address = ClientUpdateSchema.shape.ipv4Address;
const client = z.object({
  name: ClientUpdateSchema.shape.name,
  address,
  privateKey: optionalClientKey,
  publicKey: key.refine((value) => value !== zeroWireGuardKey),
  preSharedKey: optionalClientKey,
  enabled: z.boolean(),
});

const legacyConfigSchema = z.object({
  server: z.object({
    privateKey: key,
    publicKey: key,
    // Used for the gateway and its /24 CIDR.
    address,
  }),
  // v14 uses arbitrary record keys. Only use ordinals in validation errors.
  clients: z
    .record(z.string(), z.unknown())
    .transform(Object.values)
    .pipe(z.array(client)),
});

function invalidBackup(message: string) {
  return createError({
    status: 400,
    statusText: 'Invalid v14 backup',
    message,
  });
}

function parseBackup(file: string) {
  let data: unknown;
  try {
    data = JSON.parse(file);
  } catch {
    throw invalidBackup('The backup must be a JSON document.');
  }
  const result = legacyConfigSchema.safeParse(data);
  if (!result.success) {
    const field = result.error.issues[0]?.path.join('.');
    throw invalidBackup(
      field ? `Invalid backup field: ${field}` : 'Invalid backup structure.'
    );
  }
  return result.data;
}

function checkKeys(
  keys: { privateKey: string | null; publicKey: string },
  field: string,
  usedPublicKeys: Set<string>
) {
  if (keys.privateKey !== null) {
    const privateKey = createPrivateKey({
      key: Buffer.from(keys.privateKey, 'base64'),
      format: 'raw-private',
      asymmetricKeyType: 'x25519',
    });
    const publicKey = createPublicKey(privateKey).export({
      format: 'raw-public',
    });
    if (publicKey.toString('base64') !== keys.publicKey) {
      throw invalidBackup(`Key pair mismatch at ${field}`);
    }
  }
  if (usedPublicKeys.has(keys.publicKey)) {
    throw invalidBackup(`Duplicate public key at ${field}`);
  }
  usedPublicKeys.add(keys.publicKey);
}

export async function importLegacyConfiguration(
  tx: Repositories,
  file: string
) {
  const oldConfig = parseBackup(file);

  const ipv4Cidr = parseCidr(oldConfig.server.address + '/24');
  const ipv6Cidr = parseCidr('fdcc:ad94:bacf:61a4::cafe:0/112');

  await changeCidr(tx, {
    ipv4Cidr: ipv4Cidr.cidr,
    ipv6Cidr: ipv6Cidr.cidr,
  });
  const existing = await tx.clients.getAll();
  const ipv6Addresses = new Set(
    existing.map((client) => normalizeAddress(client.ipv6Address))
  );
  const ipv4Addresses = new Set(existing.map((client) => client.ipv4Address));
  const publicKeys = new Set(existing.map((client) => client.publicKey));
  checkKeys(oldConfig.server, 'server.publicKey', publicKeys);
  await tx.interfaces.update({
    privateKey: oldConfig.server.privateKey,
    publicKey: oldConfig.server.publicKey,
  });

  const defaults = await tx.userConfigs.get();
  const network = await tx.interfaces.get();
  for (const [index, clientConfig] of oldConfig.clients.entries()) {
    if (!isClientAddress(clientConfig.address, ipv4Cidr)) {
      throw invalidBackup(`Unusable peer address at clients.${index}.address`);
    }
    if (ipv4Addresses.has(clientConfig.address)) {
      throw invalidBackup(`Duplicate address at clients.${index}.address`);
    }
    checkKeys(clientConfig, `clients.${index}.publicKey`, publicKeys);
    const ipv6Address = nextIPFromUsedAddresses(ipv6Cidr, ipv6Addresses);

    await tx.clients.insert({
      ...clientDefaults(defaults),
      name: clientConfig.name,
      enabled: clientConfig.enabled,
      privateKey: clientConfig.privateKey,
      publicKey: clientConfig.publicKey,
      userId: 1,
      interfaceId: network.name,
      preSharedKey: clientConfig.preSharedKey,
      // Leave these unset so imported clients follow the global settings,
      // like clients created in the UI. v14 had no per-client values.
      allowedIps: null,
      dns: null,
      i5: null,
      ipv4Address: clientConfig.address,
      ipv6Address,
    });
    ipv6Addresses.add(ipv6Address);
    ipv4Addresses.add(clientConfig.address);
  }
}
