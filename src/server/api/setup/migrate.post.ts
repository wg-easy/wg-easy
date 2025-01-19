/*import { parseCidr } from 'cidr-tools';
import { stringifyIp } from 'ip-bigint';
import { z } from 'zod';*/

export default defineSetupEventHandler(async (/*{ event }*/) => {
  // TODO: Implement
  /*

  const { file } = await readValidatedBody(event, validateZod(fileType, event));
  const schema = z.object({
    server: z.object({
      privateKey: z.string(),
      publicKey: z.string(),
      address: z.string(),
    }),
    clients: z.record(
      z.string(),
      z.object({
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
  const system = await Database.system.get();
  const oldConfig = res.data;
  const oldCidr = parseCidr(oldConfig.server.address + '/24');
  const db = {
    system: {
      ...system,
      // TODO: migrate to db calls
      interface: {
        ...system.interface,
        address4: oldConfig.server.address,
        privateKey: oldConfig.server.privateKey,
        publicKey: oldConfig.server.publicKey,
      },
      userConfig: {
        ...system.userConfig,
        defaultDns: [...system.userConfig.defaultDns],
        allowedIps: [...system.userConfig.allowedIps],
        address4Range:
          stringifyIp({ number: oldCidr.start, version: 4 }) + '/24',
      },
    } satisfies Partial<Database['system']>,
    clients: {} as Database['clients'],
  };

  for (const oldClient of Object.values(oldConfig.clients)) {
    const address6 = nextIPv6(db.system, db.clients);

    await Database.client.create({
      address4: oldClient.address,
      enabled: oldClient.enabled,
      name: oldClient.name,
      preSharedKey: oldClient.preSharedKey,
      privateKey: oldClient.privateKey,
      publicKey: oldClient.publicKey,
      expiresAt: null,
      oneTimeLink: null,
      allowedIps: [...db.system.userConfig.allowedIps],
      serverAllowedIPs: [],
      persistentKeepalive: 0,
      address6: address6,
      mtu: 1420,
    });
  }*/

  return { success: true };
});
