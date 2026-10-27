import { parseCidr } from 'cidr-tools';
import { stringifyIp } from 'ip-bigint';
import { z } from 'zod';

import type { Repositories } from '#db/store';
import { changeCidr } from '#server/features/vpn/interface';
import { clientDefaults } from '#server/features/vpn/clients';
import { nextIPFromUsedAddresses, normalizeAddress } from '#server/utils/ip';

const legacyConfigSchema = z.object({
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
      preSharedKey: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      enabled: z.boolean(),
    })
  ),
});
export async function importLegacyConfiguration(
  tx: Repositories,
  file: string
) {
  const res = legacyConfigSchema.safeParse(JSON.parse(file));
  if (!res.success) {
    throw new Error('Invalid Config');
  }

  const oldConfig = res.data;

  await tx.interfaces.update({
    privateKey: oldConfig.server.privateKey,
    publicKey: oldConfig.server.publicKey,
  });

  const ipv4Cidr = parseCidr(oldConfig.server.address + '/24');
  const ipv6Cidr = parseCidr('fdcc:ad94:bacf:61a4::cafe:0/112');

  await changeCidr(tx, {
    ipv4Cidr:
      stringifyIp({ number: ipv4Cidr.start, version: 4 }) +
      `/${ipv4Cidr.prefix}`,
    ipv6Cidr: ipv6Cidr.cidr,
  });
  const ipv6Addresses = new Set(
    (await tx.clients.getAll()).map((client) =>
      normalizeAddress(client.ipv6Address)
    )
  );

  const defaults = await tx.userConfigs.get();
  const network = await tx.interfaces.get();
  for (const clientConfig of Object.values(oldConfig.clients)) {
    const ipv6Address = nextIPFromUsedAddresses(6, ipv6Cidr, ipv6Addresses);

    await tx.clients.insert({
      ...clientDefaults(defaults),
      name: clientConfig.name,
      enabled: clientConfig.enabled,
      privateKey: clientConfig.privateKey,
      publicKey: clientConfig.publicKey,
      userId: 1,
      interfaceId: network.name,
      preSharedKey: clientConfig.preSharedKey || null,
      allowedIps: defaults.defaultAllowedIps,
      dns: defaults.defaultDns,
      i5: null,
      ipv4Address: clientConfig.address,
      ipv6Address,
    });
    ipv6Addresses.add(ipv6Address);
  }
}
