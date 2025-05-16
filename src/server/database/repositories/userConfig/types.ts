import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';
import type { userConfig } from './schema';

export type UserConfigType = InferSelectModel<typeof userConfig>;

const host = z
  .string({ message: $i18n('zod.userConfig.host') })
  .min(1, $i18n('zod.userConfig.host'))
  .pipe(safeStringRefine);

export const UserConfigSetupSchema = z.object({
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
