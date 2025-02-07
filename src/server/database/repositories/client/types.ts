import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';

import type { client } from './schema';

export type ID = string;

export type ClientType = InferSelectModel<typeof client>;

export type CreateClientType = Omit<
  ClientType,
  'createdAt' | 'updatedAt' | 'id'
>;

export type UpdateClientType = Omit<
  CreateClientType,
  'privateKey' | 'publicKey' | 'preSharedKey'
>;

const name = z
  .string({ message: 'zod.client.name' })
  .min(1, 'zod.client.nameMin')
  .pipe(safeStringRefine);

const expiresAt = z
  .string({ message: 'zod.client.expireDate' })
  .min(1, 'zod.client.expireDateMin')
  .pipe(safeStringRefine)
  .nullable();

const address4 = z
  .string({ message: 'zod.client.address4' })
  .min(1, { message: 'zod.client.address4Min' })
  .pipe(safeStringRefine);

const address6 = z
  .string({ message: 'zod.client.address6' })
  .min(1, { message: 'zod.client.address6Min' })
  .pipe(safeStringRefine);

const serverAllowedIps = z.array(AddressSchema, {
  message: 'zod.serverAllowedIps',
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
    allowedIps: AllowedIpsSchema,
    serverAllowedIps: serverAllowedIps,
    mtu: MtuSchema,
    persistentKeepalive: PersistentKeepaliveSchema,
    dns: DnsSchema,
  })
);

// TODO: investigate if coerce is bad
const clientId = z.number({ message: 'zod.client.id', coerce: true });

export const ClientGetSchema = z.object({
  clientId: clientId,
});
