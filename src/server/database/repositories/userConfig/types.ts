import type { InferSelectModel } from 'drizzle-orm';
import type { userConfig } from './schema';

export type UserConfigType = InferSelectModel<typeof userConfig>;

const host = zod
  .string({ message: 'zod.userConfig.host' })
  .min(1, 'zod.userConfig.hostMin')
  .pipe(safeStringRefine);

const port = zod
  .number({ message: 'zod.userConfig.port' })
  .min(1, 'zod.userConfig.portMin')
  .max(65535, 'zod.userConfig.portMax');

export const UserConfigSetupType = zod.object({
  host: host,
  port: port,
});
