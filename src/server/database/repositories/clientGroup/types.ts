import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';
import { isIP } from 'is-ip';
import isCidr from 'is-cidr';

import type { clientGroup, clientGroupMembership } from './schema';

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
export type ClientGroupMembershipRowType = InferSelectModel<
  typeof clientGroupMembership
>;

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

export type ClientGroupMemberType = {
  id: number;
  name: string;
  enabled: boolean;
  ipv4Address: string;
  ipv6Address: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ClientGroupDetailsType = ClientGroupWithCountType & {
  clients: ClientGroupMemberType[];
};

export type ClientGroupMembershipType = {
  clientId: number;
  groupId: number;
  position: number;
};

export type ClientGroupEdgeType = ClientGroupMembershipType & {
  groupName: string;
};

export type ClientGroupEffectivePolicyType = {
  allowedIps: SafeEffectivePolicyFieldType;
  dns: SafeEffectivePolicyFieldType;
  firewallIps: SafeEffectivePolicyFieldType;
};

export type SafeEffectivePolicyFieldType = {
  value: string[];
  source: 'client' | 'groups' | 'global';
  groups: { id: number; name: string }[];
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

const groupAllowedIp = AddressSchema.refine(
  (value) => isIP(value) || isCidr(value),
  {
    message: t('zod.allowedIps'),
  }
);

const nonEmptyPolicyArray = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .array(schema)
    .refine((values) => values.some((value) => String(value).trim() !== ''), {
      message: t('zod.clientGroup.policyRequired'),
    })
    .min(1, { message: t('zod.clientGroup.policyRequired') });

export const ClientGroupCreateSchema = schemaForType<ClientGroupCreateType>()(
  z.object({
    name,
    description,
    allowedIps: nonEmptyPolicyArray(groupAllowedIp).nullable(),
    dns: DnsSchema.min(1, { message: t('zod.clientGroup.policyRequired') })
      .refine((values) => values.every((value) => value.trim() !== ''), {
        message: t('zod.clientGroup.policyRequired'),
      })
      .nullable(),
    firewallIps: FirewallIpsSchema.min(1, {
      message: t('zod.clientGroup.policyRequired'),
    })
      .refine((values) => values.every((value) => value.trim() !== ''), {
        message: t('zod.clientGroup.policyRequired'),
      })
      .nullable(),
  })
);

export const ClientGroupUpdateSchema = ClientGroupCreateSchema;

const groupId = z.coerce
  .number({ message: t('zod.clientGroup.id') })
  .int()
  .positive();

const clientId = z.coerce
  .number({ message: t('zod.client.id') })
  .int()
  .positive();

export const ClientGroupGetSchema = z.object({
  groupId,
});

export const ClientGroupAssignSchema = z.object({
  groupId,
});

export const ClientGroupClientParamsSchema = z.object({
  clientId,
});

export const ClientGroupMembershipReplaceSchema = z.object({
  groupIds: z.array(groupId),
});

export const ClientGroupMembershipDeleteParamsSchema = z.object({
  clientId,
  groupId,
});
