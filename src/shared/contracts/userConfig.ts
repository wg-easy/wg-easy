import z from 'zod';

import {
  AllowedIpsSchema,
  DnsSchema,
  ISchema,
  JcSchema,
  JmaxSchema,
  JminSchema,
  MtuSchema,
  PersistentKeepaliveSchema,
  PortSchema,
  safeStringRefine,
  t,
} from '#shared/contracts/validation';

const host = z
  .string({ message: t('zod.userConfig.host') })
  .min(1, t('zod.userConfig.host'))
  .pipe(safeStringRefine);

export const UserConfigSetupSchema = z.object({
  host: host,
  port: PortSchema,
});

export const UserConfigUpdateSchema = z.object({
  port: PortSchema,
  defaultMtu: MtuSchema,
  defaultPersistentKeepalive: PersistentKeepaliveSchema,
  defaultGeneratePreSharedKey: z.boolean(),
  defaultDns: DnsSchema,
  defaultAllowedIps: AllowedIpsSchema,
  defaultJC: JcSchema,
  defaultJMin: JminSchema,
  defaultJMax: JmaxSchema,
  defaultI1: ISchema,
  defaultI2: ISchema,
  defaultI3: ISchema,
  defaultI4: ISchema,
  defaultI5: ISchema,
  host: host,
});

export type UserConfigUpdateType = z.infer<typeof UserConfigUpdateSchema>;
