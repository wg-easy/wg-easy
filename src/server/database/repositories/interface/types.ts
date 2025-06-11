import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';
import isCidr from 'is-cidr';
import type { wgInterface } from './schema';

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
  .string({ message: $i18n('zod.interface.device') })
  .min(1, $i18n('zod.interface.device'))
  .pipe(safeStringRefine);

const cidr = z
  .string({ message: $i18n('zod.interface.cidr') })
  .min(1, { message: $i18n('zod.interface.cidr') })
  .refine((value) => isCidr(value), {
    message: $i18n('zod.interface.cidrValid'),
  })
  .pipe(safeStringRefine);

export const InterfaceUpdateSchema = schemaForType<InterfaceUpdateType>()(
  z.object({
    ipv4Cidr: cidr,
    ipv6Cidr: cidr,
    mtu: MtuSchema,
    port: PortSchema,
    device: device,
    enabled: EnabledSchema,
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
