import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';

import type { client } from './schema';

export type ClientType = InferSelectModel<typeof client>;

export type ClientNextIpType = Pick<ClientType, 'ipv4Address' | 'ipv6Address'>;

export type CreateClientType = Omit<
  ClientType,
  'createdAt' | 'updatedAt' | 'id'
>;

export type UpdateClientType = Omit<
  CreateClientType,
  'privateKey' | 'publicKey' | 'preSharedKey' | 'userId'
>;

const name = z
  .string({ message: $i18n('zod.client.name') })
  .min(1, $i18n('zod.client.name'))
  .pipe(safeStringRefine);

// TODO?: validate iso string
const expiresAt = z
  .string({ message: $i18n('zod.client.expiresAt') })
  .min(1, $i18n('zod.client.expiresAt'))
  .pipe(safeStringRefine)
  .nullable();

const address4 = z
  .string({ message: $i18n('zod.client.address4') })
  .min(1, { message: $i18n('zod.client.address4') })
  .pipe(safeStringRefine);

const address6 = z
  .string({ message: $i18n('zod.client.address6') })
  .min(1, { message: $i18n('zod.client.address6') })
  .pipe(safeStringRefine);

const serverAllowedIps = z.array(AddressSchema, {
  message: $i18n('zod.client.serverAllowedIps'),
});

export const ClientCreateSchema = z.object({
  name: name,
  expiresAt: expiresAt,
});

export type ClientCreateType = z.infer<typeof ClientCreateSchema>;

export const ClientUpdateSchema = schemaForType<UpdateClientType>()(
  z.object({
    name: name,
    enabled: EnabledSchema,
    expiresAt: expiresAt,
    ipv4Address: address4,
    ipv6Address: address6,
    preUp: HookSchema,
    postUp: HookSchema,
    preDown: HookSchema,
    postDown: HookSchema,
    allowedIps: AllowedIpsSchema.nullable(),
    serverAllowedIps: serverAllowedIps,
    mtu: MtuSchema,
    persistentKeepalive: PersistentKeepaliveSchema,
    serverEndpoint: AddressSchema.nullable(),
    dns: DnsSchema.nullable(),
  })
);

// TODO: investigate if coerce is bad
const clientId = z.number({ message: $i18n('zod.client.id'), coerce: true });

export const ClientGetSchema = z.object({
  clientId: clientId,
});

export type ClientCreateFromExistingType = Pick<
  ClientType,
  | 'name'
  | 'ipv4Address'
  | 'ipv6Address'
  | 'privateKey'
  | 'preSharedKey'
  | 'publicKey'
  | 'enabled'
>;
