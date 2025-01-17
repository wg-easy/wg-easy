import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';

import type { client } from './schema';

const schemaForType =
  <T>() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <S extends z.ZodType<T, any, any>>(arg: S) => {
    return arg;
  };

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

const address = z
  .string({ message: 'zod.client.address' })
  .min(1, { message: 'zod.client.addressMin' })
  .pipe(safeStringRefine);

const address4 = z
  .string({ message: 'zod.client.address4' })
  .min(1, { message: 'zod.client.address4Min' })
  .pipe(safeStringRefine);

const address6 = z
  .string({ message: 'zod.client.address6' })
  .min(1, { message: 'zod.client.address6Min' })
  .pipe(safeStringRefine);

const allowedIps = z
  .array(address, { message: 'zod.client.allowedIps' })
  .min(1, { message: 'zod.client.allowedIpsMin' });

const serverAllowedIps = z.array(address, {
  message: 'zod.serverAllowedIps',
});

const mtu = z
  .number({ message: 'zod.client.mtu' })
  .min(1280, { message: 'zod.client.mtuMin' })
  .max(9000, { message: 'zod.client.mtuMax' });

const persistentKeepalive = z
  .number({ message: 'zod.client.persistentKeepalive' })
  .min(0, 'zod.client.persistentKeepaliveMin')
  .max(65535, 'zod.client.persistentKeepaliveMax');

const enabled = z.boolean({ message: 'zod.enabled' });

const dns = z
  .array(address, { message: 'zod.client.dns' })
  .min(1, 'zod.client.dnsMin');

export const ClientCreateSchema = z.object({
  name: name,
  expiresAt: expiresAt,
});

export type ClientCreateType = z.infer<typeof ClientCreateSchema>;

export const ClientUpdateSchema = schemaForType<UpdateClientType>()(
  z.object({
    name: name,
    enabled: enabled,
    expiresAt: expiresAt,
    ipv4Address: address4,
    ipv6Address: address6,
    allowedIps: allowedIps,
    serverAllowedIps: serverAllowedIps,
    mtu: mtu,
    persistentKeepalive: persistentKeepalive,
    dns: dns,
  })
);

const clientId = z.number({ message: 'zod.client.id' });

export const ClientGetSchema = z.object({
  clientId: clientId,
});
