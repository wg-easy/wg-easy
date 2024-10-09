import { z } from 'zod';

// TODO: check what are missing
const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  privateKey: z.string(),
  publicKey: z.string(),
  preSharedKey: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  enabled: z.boolean(),
});

const oldConfigSchema = z.object({
  server: z.object({
    privateKey: z.string(),
    publicKey: z.string(),
    address: z.string(),
  }),
  clients: z.record(z.string(), clientSchema),
});

export default defineEventHandler(async (event) => {
  const { file } = await readValidatedBody(event, validateZod(fileType, event));
  const file_ = await oldConfigSchema.parseAsync(JSON.parse(file));

  // TODO: handle migration
  console.log('zod file_', file_);

  return { success: true };
});
