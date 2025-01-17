import type { InferSelectModel } from 'drizzle-orm';
import type { userConfig } from './schema';
import z from 'zod';

export type UserConfigType = InferSelectModel<typeof userConfig>;

const host = z
  .string({ message: 'zod.userConfig.host' })
  .min(1, 'zod.userConfig.hostMin')
  .pipe(safeStringRefine);

const port = z
  .number({ message: 'zod.userConfig.port' })
  .min(1, 'zod.userConfig.portMin')
  .max(65535, 'zod.userConfig.portMax');

export const UserConfigSetupType = z.object({
  host: host,
  port: port,
});
