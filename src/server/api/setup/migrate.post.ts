import { parseCidr } from 'cidr-tools';
import { stringifyIp } from 'ip-bigint';
import { z } from 'zod';

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

  await Database.interfaces.updateKeyPair(
    oldConfig.server.privateKey,
    oldConfig.server.publicKey
  );

  const ipv4Cidr = parseCidr(oldConfig.server.address + '/24');
  const ipv6Cidr = parseCidr('fdcc:ad94:bacf:61a4::cafe:0/112');

  await Database.interfaces.updateCidr({
    ipv4Cidr:
      stringifyIp({ number: ipv4Cidr.start, version: 4 }) +
      `/${ipv4Cidr.prefix}`,
    ipv6Cidr: ipv6Cidr.cidr,
  });

  for (const clientId in oldConfig.clients) {
    const clientConfig = oldConfig.clients[clientId];

    if (!clientConfig) {
      continue;
    }

    const clients = await Database.clients.getAll();

    const ipv6Address = nextIP(6, ipv6Cidr, clients);

    await Database.clients.createFromExisting({
      ...clientConfig,
      ipv4Address: clientConfig.address,
      ipv6Address,
    });
  }

  await Database.general.setSetupStep(0);
  return { success: true };
});
