import z from 'zod';
import { isIPv4, isIPv6 } from 'is-ip';

import { clientBulkActions } from '#shared/utils/clientBulk';
import {
  clientExpiryFilters,
  clientSortFields,
  clientStatusFilters,
} from '#shared/utils/clientList';
import {
  EndpointSchema,
  AllowedIpEntrySchema,
  AllowedIpsSchema,
  AwgRangeSchema,
  DnsSchema,
  EnabledSchema,
  FirewallIpsSchema,
  HookSchema,
  ISchema,
  JcSchema,
  JmaxSchema,
  JminSchema,
  MtuSchema,
  PersistentKeepaliveSchema,
  controlStringRefine,
  safeStringRefine,
  t,
} from '#shared/contracts/validation';

const name = z
  .string({ message: t('validation.client.name') })
  .min(1, t('validation.client.name'))
  .pipe(safeStringRefine)
  .pipe(controlStringRefine);

// TODO?: validate iso string
const expiresAt = z
  .string({ message: t('validation.client.expiresAt') })
  .min(1, t('validation.client.expiresAt'))
  .pipe(safeStringRefine)
  .nullable();

const address4 = z
  .string({ message: t('validation.client.address4') })
  .min(1, { message: t('validation.client.address4') })
  .pipe(safeStringRefine)
  .pipe(controlStringRefine)
  .refine((v) => isIPv4(v));

const address6 = z
  .string({ message: t('validation.client.address6') })
  .min(1, { message: t('validation.client.address6') })
  .pipe(safeStringRefine)
  .pipe(controlStringRefine)
  .refine((v) => isIPv6(v));

const serverAllowedIps = z.array(AllowedIpEntrySchema, {
  message: t('validation.client.serverAllowedIps'),
});

export const ClientCreateSchema = z.object({
  name: name,
  expiresAt: expiresAt,
});

export type ClientCreateType = z.infer<typeof ClientCreateSchema>;

export const ClientQuerySchema = z.object({
  filter: z.string().pipe(safeStringRefine).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  status: z.enum(clientStatusFilters).optional(),
  expiry: z.enum(clientExpiryFilters).optional(),
  sortBy: z.enum(clientSortFields).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type ClientQueryType = z.infer<typeof ClientQuerySchema>;

export const ClientBulkSchema = z.object({
  action: z.enum(clientBulkActions),
  clientIds: z
    .array(z.number().int().positive())
    .min(1)
    .max(100)
    .transform((ids) => [...new Set(ids)]),
});

export type ClientBulkType = z.infer<typeof ClientBulkSchema>;

export const ClientUpdateSchema = z.object({
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
  firewallIps: FirewallIpsSchema.nullable(),
  mtu: MtuSchema,
  jC: JcSchema,
  jMin: JminSchema,
  jMax: JmaxSchema,
  i1: ISchema,
  i2: ISchema,
  i3: ISchema,
  i4: ISchema,
  i5: ISchema,
  contentPaddingAddition: AwgRangeSchema,
  rekeyAfterTime: AwgRangeSchema,
  rekeyTimeout: AwgRangeSchema,
  rejectAfterTime: AwgRangeSchema,
  keepaliveTimeout: AwgRangeSchema,
  maxHandshakeAttempts: AwgRangeSchema,
  disableCookies: z.boolean().nullable(),
  persistentKeepalive: PersistentKeepaliveSchema,
  serverEndpoint: EndpointSchema.nullable(),
  dns: DnsSchema.nullable(),
});

const clientId = z.coerce.number({ message: t('validation.client.id') });

export const ClientGetSchema = z.object({
  clientId: clientId,
});

export type UpdateClientType = z.infer<typeof ClientUpdateSchema>;
