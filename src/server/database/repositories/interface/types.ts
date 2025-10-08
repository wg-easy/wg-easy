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
  .string({ message: t('zod.interface.device') })
  .min(1, t('zod.interface.device'))
  .pipe(safeStringRefine);

const cidr = z
  .string({ message: t('zod.interface.cidr') })
  .min(1, { message: t('zod.interface.cidr') })
  .refine((value) => isCidr(value), { message: t('zod.interface.cidrValid') })
  .pipe(safeStringRefine);

// Constants from amneziawg-go validation
const MAX_SEGMENT_SIZE = 65535; // Default (1 << 16) - 1
const MESSAGE_INITIATION_SIZE = 148;
const MESSAGE_RESPONSE_SIZE = 92;

// Amnezia documentation constraints (assuming MTU = 1280)
const MTU = 1280;
const S1_MAX_MTU = MTU - MESSAGE_INITIATION_SIZE; // 1132
const S2_MAX_MTU = MTU - MESSAGE_RESPONSE_SIZE;   // 1188

export const InterfaceUpdateSchema = schemaForType<InterfaceUpdateType>()(
  z.object({
    ipv4Cidr: cidr,
    ipv6Cidr: cidr,
    mtu: MtuSchema,
    port: PortSchema,
    device: device,
    enabled: EnabledSchema,
    // AmneziaWG obfuscation parameters
    // Constraints based on Amnezia documentation:
    // Jc: 1 ≤ Jc ≤ 128 (recommended 4-12)
    // Jmin: Jmax > Jmin < 1280 (recommended 8)
    // Jmax: Jmin < Jmax ≤ 1280 (recommended 80)
    // S1: S1 ≤ 1132, S1 + 56 ≠ S2 (recommended 15-150)
    // S2: S2 ≤ 1188 (recommended 15-150)
    // H1-H4: > 4 and unique (recommended 5 to 2147483647)
    jc: z
      .number()
      .int()
      .min(1, { message: 'Jc must be between 1 and 128' })
      .max(128, { message: 'Jc must be between 1 and 128' }),
    jmin: z
      .number()
      .int()
      .min(0, { message: 'Jmin must be between 0 and 1279' })
      .max(MTU - 1, { message: `Jmin must be between 0 and ${MTU - 1}` }),
    jmax: z
      .number()
      .int()
      .min(1, { message: `Jmax must be between 1 and ${MTU}` })
      .max(MTU, { message: `Jmax must be between 1 and ${MTU}` }),
    s1: z
      .number()
      .int()
      .min(0, { message: `S1 must be between 0 and ${S1_MAX_MTU}` })
      .max(S1_MAX_MTU, {
        message: `S1 must be between 0 and ${S1_MAX_MTU}`,
      }),
    s2: z
      .number()
      .int()
      .min(0, { message: `S2 must be between 0 and ${S2_MAX_MTU}` })
      .max(S2_MAX_MTU, {
        message: `S2 must be between 0 and ${S2_MAX_MTU}`,
      }),
    // Magic headers must be > 4 to enable obfuscation
    h1: z
      .number()
      .int()
      .min(5, { message: 'H1 must be > 4 to enable obfuscation' })
      .max(0xffffffff, { message: 'H1 must be a valid uint32' }),
    h2: z
      .number()
      .int()
      .min(5, { message: 'H2 must be > 4 to enable obfuscation' })
      .max(0xffffffff, { message: 'H2 must be a valid uint32' }),
    h3: z
      .number()
      .int()
      .min(5, { message: 'H3 must be > 4 to enable obfuscation' })
      .max(0xffffffff, { message: 'H3 must be a valid uint32' }),
    h4: z
      .number()
      .int()
      .min(5, { message: 'H4 must be > 4 to enable obfuscation' })
      .max(0xffffffff, { message: 'H4 must be a valid uint32' }),
    // AmneziaWG 1.5 parameters
    s3: z
      .number()
      .int()
      .min(0, { message: `S3 must be between 0 and ${S1_MAX_MTU}` })
      .max(S1_MAX_MTU, {
        message: `S3 must be between 0 and ${S1_MAX_MTU}`,
      }),
    s4: z
      .number()
      .int()
      .min(0, { message: `S4 must be between 0 and ${S2_MAX_MTU}` })
      .max(S2_MAX_MTU, {
        message: `S4 must be between 0 and ${S2_MAX_MTU}`,
      }),
    // I1-I5: Special junk packets (hex format like <b 0x...>)
    i1: z.string().max(10000, { message: 'I1 packet too large (max 10000 chars)' }),
    i2: z.string().max(10000, { message: 'I2 packet too large (max 10000 chars)' }),
    i3: z.string().max(10000, { message: 'I3 packet too large (max 10000 chars)' }),
    i4: z.string().max(10000, { message: 'I4 packet too large (max 10000 chars)' }),
    i5: z.string().max(10000, { message: 'I5 packet too large (max 10000 chars)' }),
    // J1-J3: Junk packet scheduling
    j1: z.string().max(1000, { message: 'J1 too large (max 1000 chars)' }),
    j2: z.string().max(1000, { message: 'J2 too large (max 1000 chars)' }),
    j3: z.string().max(1000, { message: 'J3 too large (max 1000 chars)' }),
    // Itime: Interval time (0-2147483647)
    itime: z
      .number()
      .int()
      .min(0, { message: 'Itime must be >= 0' })
      .max(2147483647, { message: 'Itime must be <= 2147483647' }),
  })
    .refine((data) => data.jmax > data.jmin, {
      message: 'Jmax must be > Jmin',
      path: ['jmax'],
    })
    .refine((data) => data.s1 + 56 !== data.s2, {
      message: 'S1 + 56 must not equal S2',
      path: ['s2'],
    })
    .refine(
      (data) => {
        // All magic headers must be distinct
        const headers = [data.h1, data.h2, data.h3, data.h4];
        const uniqueHeaders = new Set(headers);
        return uniqueHeaders.size === 4;
      },
      {
        message: 'All magic headers (H1-H4) must be distinct values',
        path: ['h1'],
      }
    )
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
