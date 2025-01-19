import type { InferSelectModel } from 'drizzle-orm';
import type { wgInterface } from './schema';
import z from 'zod';

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
  .string({ message: 'zod.device' })
  .min(1, 'zod.deviceMin')
  .pipe(safeStringRefine);

const cidr = z
  .string({ message: 'zod.interface.cidr' })
  .min(1, { message: 'zod.interface.cidrMin' })
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
