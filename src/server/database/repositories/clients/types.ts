import type { InferSelectModel } from 'drizzle-orm';
import { zod } from '#imports';

import type { clients } from './schema';

const schemaForType =
  <T>() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <S extends zod.ZodType<T, any, any>>(arg: S) => {
    return arg;
  };

export type ClientsType = InferSelectModel<typeof clients>;

export type CreateClientType = Omit<
  ClientsType,
  'createdAt' | 'updatedAt' | 'id'
>;

export type UpdateClientType = Omit<
  CreateClientType,
  'privateKey' | 'publicKey' | 'preSharedKey'
>;

const name = zod
  .string({ message: 'zod.name' })
  .min(1, 'zod.nameMin')
  .pipe(safeStringRefine);

const expireDate = zod
  .string({ message: 'zod.expireDate' })
  .min(1, 'zod.expireDateMin')
  .pipe(safeStringRefine)
  .nullable();

const address = zod
  .string({ message: 'zod.address' })
  .min(1, { message: 'zod.addressMin' })
  .pipe(safeStringRefine);

const address4 = zod
  .string({ message: 'zod.address4' })
  .min(1, { message: 'zod.address4Min' })
  .pipe(safeStringRefine);

const address6 = zod
  .string({ message: 'zod.address6' })
  .min(1, { message: 'zod.address6Min' })
  .pipe(safeStringRefine);

const allowedIps = zod
  .array(address, { message: 'zod.allowedIps' })
  .min(1, { message: 'zod.allowedIpsMin' });

const serverAllowedIps = zod.array(address, {
  message: 'zod.serverAllowedIps',
});

const mtu = zod
  .number({ message: 'zod.mtu' })
  .min(1280, { message: 'zod.mtuMin' })
  .max(9000, { message: 'zod.mtuMax' });

const persistentKeepalive = zod
  .number({ message: 'zod.persistentKeepalive' })
  .min(0, 'zod.persistentKeepaliveMin')
  .max(65535, 'zod.persistentKeepaliveMax');

const enabled = zod.boolean({ message: 'zod.enabled' });

const dns = zod.array(address, { message: 'zod.dns' }).min(1, 'zod.dnsMin');

export const ClientUpdateSchema = schemaForType<UpdateClientType>()(
  zod.object({
    name: name,
    enabled: enabled,
    expiresAt: expireDate,
    ipv4Address: address4,
    ipv6Address: address6,
    allowedIps: allowedIps,
    serverAllowedIps: serverAllowedIps,
    mtu: mtu,
    persistentKeepalive: persistentKeepalive,
    dns: dns,
  })
);
