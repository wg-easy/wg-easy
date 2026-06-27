import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';

import type { clientGroup } from './schema';

import {
  AddressSchema,
  DnsSchema,
  FirewallIpsSchema,
  controlStringRefine,
  safeStringRefine,
  schemaForType,
  t,
} from '#server/utils/types';

export type ClientGroupType = InferSelectModel<typeof clientGroup>;

export type ClientGroupCreateType = Pick<
  ClientGroupType,
  'name' | 'description' | 'allowedIps' | 'dns' | 'firewallIps'
>;

export type ClientGroupUpdateType = ClientGroupCreateType;

export type ClientGroupResultType = Omit<
  ClientGroupType,
  'createdAt' | 'updatedAt'
> & {
  createdAt: Date;
  updatedAt: Date;
};

export type ClientGroupWithCountType = ClientGroupResultType & {
  assignedClientCount: number;
};

const name = z
  .string({ message: t('zod.clientGroup.name') })
  .trim()
  .min(1, t('zod.clientGroup.name'))
  .pipe(safeStringRefine)
  .pipe(controlStringRefine);

const description = z
  .string({ message: t('zod.clientGroup.description') })
  .pipe(safeStringRefine)
  .pipe(controlStringRefine)
  .nullable();

export const ClientGroupCreateSchema = schemaForType<ClientGroupCreateType>()(
  z.object({
    name,
    description,
    allowedIps: z.array(AddressSchema).nullable(),
    dns: DnsSchema.nullable(),
    firewallIps: FirewallIpsSchema.nullable(),
  })
);

export const ClientGroupUpdateSchema = ClientGroupCreateSchema;
