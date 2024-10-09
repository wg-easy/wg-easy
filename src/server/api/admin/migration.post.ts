import { parseCidr } from 'cidr-tools';
import { stringifyIp } from 'ip-bigint';
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

  for (const [_, value] of Object.entries(file_.clients)) {
    // remove the unused field
    const { address: _, ...filterValue } = value;
    const cidr4 = parseCidr(value.address);
    const address4 = stringifyIp({ number: cidr4.start + 0n, version: 4 });

    await Database.client.create({
      ...filterValue,
      address4,
      address6: '',
      expiresAt: null,
      allowedIPs: ['0.0.0.0/0', '::/0'],
      oneTimeLink: null,
      serverAllowedIPs: [],
      persistentKeepalive: 0,
    });
  }

  return { success: true };
});
