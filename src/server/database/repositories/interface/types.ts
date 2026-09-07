import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';
import isCidr from 'is-cidr';

import type { wgInterface } from './schema';

import {
  AwgRangeSchema,
  EnabledSchema,
  HSchema,
  ISchema,
  JcSchema,
  JmaxSchema,
  JminSchema,
  KeySchema,
  MtuSchema,
  PortSchema,
  RoutingTableSchema,
  SSchema,
  safeStringRefine,
  schemaForType,
  t,
} from '#server/utils/types';

export type InterfaceType = InferSelectModel<typeof wgInterface>;

export type InterfaceCreateType = Omit<
  InterfaceType,
  'createdAt' | 'updatedAt'
>;

export type InterfaceUpdateType = Omit<
  InterfaceCreateType,
  'name' | 'createdAt' | 'updatedAt' | 'privateKey' | 'publicKey'
>;

const device = z
  .string({ message: t('zod.interface.device') })
  .min(1, t('zod.interface.device'))
  .pipe(safeStringRefine);

const cidr = z
  .string({ message: t('zod.interface.cidr') })
  .min(1, { message: t('zod.interface.cidr') })
  .refine((value) => isCidr(value), { message: t('zod.interface.cidrValid') })
  .pipe(safeStringRefine);

/**
 * Header protection uses the first 12 bytes of every junk prefix as the nonce
 * for its cipher, so all four junk sizes have to be at least that large.
 */
const HEADER_PROTECTION_MIN_JUNK_SIZE = 12;

export const InterfaceUpdateSchema = schemaForType<InterfaceUpdateType>()(
  z
    .object({
      ipv4Cidr: cidr,
      ipv6Cidr: cidr,
      mtu: MtuSchema,
      routingTable: RoutingTableSchema,
      jC: JcSchema,
      jMin: JminSchema,
      jMax: JmaxSchema,
      s1: SSchema,
      s2: SSchema,
      s3: SSchema,
      s4: SSchema,
      h1: HSchema,
      h2: HSchema,
      h3: HSchema,
      h4: HSchema,
      i1: ISchema,
      i2: ISchema,
      i3: ISchema,
      i4: ISchema,
      i5: ISchema,
      headerProtectionKey: KeySchema,
      contentPaddingAddition: AwgRangeSchema,
      rekeyAfterTime: AwgRangeSchema,
      rekeyTimeout: AwgRangeSchema,
      rejectAfterTime: AwgRangeSchema,
      keepaliveTimeout: AwgRangeSchema,
      maxHandshakeAttempts: AwgRangeSchema,
      randomTrailers: z.boolean().nullable(),
      disableCookies: z.boolean().nullable(),
      port: PortSchema,
      device: device,
      enabled: EnabledSchema,
      firewallEnabled: EnabledSchema,
    })
    .superRefine((data, ctx) => {
      if (data.headerProtectionKey === null) return;

      for (const junk of ['s1', 's2', 's3', 's4'] as const) {
        const size = data[junk];

        if (size === null || size < HEADER_PROTECTION_MIN_JUNK_SIZE) {
          ctx.addIssue({
            code: 'custom',
            path: [junk],
            message: t('zod.interface.headerProtectionJunkSize'),
          });
        }
      }
    })
);

export type InterfaceCidrUpdateType = {
  ipv4Cidr: string;
  ipv6Cidr: string;
};

export const InterfaceCidrUpdateSchema =
  schemaForType<InterfaceCidrUpdateType>()(
    z.object({
      ipv4Cidr: cidr,
      ipv6Cidr: cidr,
    })
  );
