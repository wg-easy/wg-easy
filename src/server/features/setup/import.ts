import { createPrivateKey, createPublicKey } from 'node:crypto';

import { parseCidr } from 'cidr-tools';
import { createError } from 'nuxt/server';
import { z } from 'zod';

import type { Repositories } from '#db/store';
import { renumberClients } from '#server/features/vpn/subnets';
import { clientDefaults } from '#server/features/vpn/clients';
import {
  isClientAddress,
  nextIPFromUsedAddresses,
  normalizeAddress,
} from '#server/utils/ip';
import { KeySchema } from '#shared/contracts/validation';
import { ClientUpdateSchema } from '#shared/contracts/client';
import { zeroWireGuardKey } from '#shared/utils/wireguard';

const nonzero = (key: string | null) => key !== zeroWireGuardKey;
const key = KeySchema.unwrap().refine(nonzero);
const optionalKey = KeySchema.or(z.literal(''))
  .optional()
  .transform((value) => value || null);
const address = ClientUpdateSchema.shape.ipv4Address;
const client = z.object({
  name: ClientUpdateSchema.shape.name,
  address,
  privateKey: optionalKey.refine(nonzero),
  publicKey: key,
  preSharedKey: optionalKey.transform((value) =>
    value === zeroWireGuardKey ? null : value
  ),
  enabled: z.boolean(),
});

const legacyConfigSchema = z.object({
  server: z.object({
    privateKey: key,
    publicKey: key,
    // Used for the gateway and its /24 CIDR.
    address,
  }),
  // A Zod record silently drops __proto__. Check the original IDs first,
  // then validate by ordinal so peer errors never include the original IDs.
  clients: z
    .custom<Record<string, unknown>>(
      (value) =>
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !Object.hasOwn(value, '__proto__')
    )
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
  const { server, clients } = parseBackup(file);
  const ipv4Cidr = parseCidr(server.address + '/24');
  const ipv6Cidr = parseCidr('fdcc:ad94:bacf:61a4::cafe:0/112');

  const cidrs = {
    ipv4Cidr: ipv4Cidr.cidr,
    ipv6Cidr: ipv6Cidr.cidr,
  };
  await tx.interfaces.update(cidrs);
  const existing = await tx.clients.getAll();
  await renumberClients(tx, existing, cidrs);
  const ipv6Addresses = new Set(
    existing.map((client) => normalizeAddress(client.ipv6Address))
  );
  const ipv4Addresses = new Set(existing.map((client) => client.ipv4Address));
  const publicKeys = new Set(existing.map((client) => client.publicKey));
  checkKeys(server, 'server.publicKey', publicKeys);
  await tx.interfaces.update({
    privateKey: server.privateKey,
    publicKey: server.publicKey,
  });

  const defaults = await tx.userConfigs.get();
  const network = await tx.interfaces.get();
  for (const [index, { address, ...peer }] of clients.entries()) {
    if (!isClientAddress(address, ipv4Cidr)) {
      throw invalidBackup(`Unusable peer address at clients.${index}.address`);
    }
    if (ipv4Addresses.has(address)) {
      throw invalidBackup(`Duplicate address at clients.${index}.address`);
    }
    checkKeys(peer, `clients.${index}.publicKey`, publicKeys);
    const ipv6Address = nextIPFromUsedAddresses(ipv6Cidr, ipv6Addresses);

    await tx.clients.insert({
      ...clientDefaults(defaults),
      ...peer,
      userId: 1,
      interfaceId: network.name,
      i5: null,
      ipv4Address: address,
      ipv6Address,
    });
    ipv6Addresses.add(ipv6Address);
    ipv4Addresses.add(address);
  }
}
