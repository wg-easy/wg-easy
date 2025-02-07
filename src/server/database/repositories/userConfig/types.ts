import type { InferSelectModel } from 'drizzle-orm';
import type { userConfig } from './schema';
import z from 'zod';

export type UserConfigType = InferSelectModel<typeof userConfig>;

const host = z
  .string({ message: 'zod.userConfig.host' })
  .min(1, 'zod.userConfig.hostMin')
  .pipe(safeStringRefine);

export const UserConfigSetupType = z.object({
  host: host,
  port: PortSchema,
});

export type UserConfigUpdateType = Omit<
  UserConfigType,
  'id' | 'createdAt' | 'updatedAt'
>;

export const UserConfigUpdateSchema = schemaForType<UserConfigUpdateType>()(
  z.object({
    port: PortSchema,
    defaultMtu: MtuSchema,
    defaultPersistentKeepalive: PersistentKeepaliveSchema,
    defaultDns: DnsSchema,
    defaultAllowedIps: AllowedIpsSchema,
    host: host,
  })
);
