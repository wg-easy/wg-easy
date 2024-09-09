import debug from 'debug';
import packageJson from '@@/package.json';
import { z } from 'zod';
import type { Database } from '~~/services/database/repositories/database';

export const WG_PATH = process.env.WG_PATH || '/etc/wireguard/';

export const RELEASE = packageJson.release.version;

export const SERVER_DEBUG = debug('Server');

export async function migrateConfig(input: unknown) {
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
  const res = await schema.safeParseAsync(input);
  if (!res.success) {
    throw new Error('Invalid Config');
  }
  const system = await Database.getSystem();
  const oldConfig = res.data;
  const db = {
    system: {
      ...system,
      interface: {
        ...system.interface,
        address4: oldConfig.server.address,
        privateKey: oldConfig.server.privateKey,
        publicKey: oldConfig.server.publicKey,
      },
      userConfig: {
        ...system.userConfig,
        address4Range: 'TODO',
      },
    } satisfies Partial<Database['system']>,
    clients: {} as Database['clients'],
  };
  for (const [oldId, oldClient] of Object.entries(oldConfig.clients)) {
    db.clients[oldId] = {
      id: oldId,
      address4: oldClient.address,
      createdAt: oldClient.createdAt,
      enabled: oldClient.enabled,
      name: oldClient.name,
      preSharedKey: oldClient.preSharedKey,
      privateKey: oldClient.privateKey,
      publicKey: oldClient.publicKey,
      updatedAt: oldClient.updatedAt,
      endpoint: null,
      expiresAt: null,
      oneTimeLink: null,
      allowedIPs: ['0.0.0.0/0', '::/0'],
      serverAllowedIPs: [],
      persistentKeepalive: 0,
      address6: 'TODO',
    };
  }
}
