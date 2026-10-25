import { createError, readValidatedBody } from 'h3';
import { parseCidr } from 'cidr-tools';
import { stringifyIp } from 'ip-bigint';
import { z } from 'zod';

import Database from '#server/utils/Database';
import { defineSetupEventHandler } from '#server/utils/handler';
import {
  isAssignableClientAddress,
  nextIPFromUsedAddresses,
} from '#server/utils/ip';
import { FileSchema, validateZod } from '#server/utils/types';

function invalidImport(message: string) {
  return createError({
    statusCode: 400,
    statusMessage: 'Invalid Config',
    message,
  });
}

function reservedClientsMessage(bad: { name: string; address: string }[]) {
  const parts = bad.map(
    (client) => `client "${client.name}" (${client.address})`
  );
  const list =
    parts.length === 1
      ? `${parts[0]} is`
      : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]} are`;
  return (
    `Invalid Config: ${list} not available for a client. ` +
    'Use an address in the subnet except the network, server, and last address. Nothing was imported.'
  );
}

export default defineSetupEventHandler('migrate', async ({ event }) => {
  const { file } = await readValidatedBody(
    event,
    validateZod(FileSchema, event)
  );

  const schema = z.object({
    server: z.object({
      privateKey: z.string(),
      publicKey: z.string(),
      // only used for cidr
      address: z.string(),
    }),
    clients: z.record(
      z.string(),
      z.object({
        // not used, breaks compatibility with older versions
        id: z.string().optional(),
        name: z.string(),
        address: z.string(),
        privateKey: z.string(),
        publicKey: z.string(),
        preSharedKey: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        enabled: z.boolean(),
      })
    ),
  });
  const res = await schema.safeParseAsync(JSON.parse(file));
  if (!res.success) {
    throw new Error('Invalid Config');
  }

  const oldConfig = res.data;

  let ipv4Cidr;
  try {
    ipv4Cidr = parseCidr(oldConfig.server.address + '/24');
  } catch {
    throw invalidImport(
      'Invalid Config: the server address is not a usable IPv4 network. Nothing was imported.'
    );
  }
  const ipv4CidrText =
    stringifyIp({ number: ipv4Cidr.start, version: 4 }) + `/${ipv4Cidr.prefix}`;
  const reserved = [];
  for (const clientConfig of Object.values(oldConfig.clients)) {
    if (!clientConfig) {
      continue;
    }
    if (!isAssignableClientAddress(ipv4CidrText, clientConfig.address)) {
      reserved.push({
        name: clientConfig.name,
        address: clientConfig.address,
      });
    }
  }
  if (reserved.length > 0) {
    throw invalidImport(reservedClientsMessage(reserved));
  }

  await Database.interfaces.updateKeyPair(
    oldConfig.server.privateKey,
    oldConfig.server.publicKey
  );

  const ipv6Cidr = parseCidr('fdcc:ad94:bacf:61a4::cafe:0/112');

  await Database.interfaces.updateCidr({
    ipv4Cidr: ipv4CidrText,
    ipv6Cidr: ipv6Cidr.cidr,
  });
  const ipv6Addresses = new Set(
    (await Database.clients.getAll()).map((client) => client.ipv6Address)
  );

  for (const clientId in oldConfig.clients) {
    const clientConfig = oldConfig.clients[clientId];

    if (!clientConfig) {
      continue;
    }

    const ipv6Address = nextIPFromUsedAddresses(6, ipv6Cidr, ipv6Addresses);

    await Database.clients.createFromExisting({
      ...clientConfig,
      ipv4Address: clientConfig.address,
      ipv6Address,
    });
    ipv6Addresses.add(ipv6Address);
  }

  await Database.general.setSetupStep(0);
  return { success: true };
});
