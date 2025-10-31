import { OneTimeLinkGetSchema } from '#db/repositories/oneTimeLink/types';

export default defineEventHandler(async (event) => {
  const { oneTimeLink } = await getValidatedRouterParams(
    event,
    validateZod(OneTimeLinkGetSchema, event)
  );

  const otl = await Database.oneTimeLinks.getByOtl(oneTimeLink);
  if (!otl) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Invalid One Time Link',
    });
  }

  const client = await Database.clients.get(otl.id);
  if (!client) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Invalid One Time Link',
    });
  }

  const config = await WireGuard.getClientConfiguration({
    clientId: client.id,
  });
  await Database.oneTimeLinks.erase(otl.id);

  const configName = client.name
    .replace(/[^a-zA-Z0-9_=+.-]/g, '-')
    .replace(/(-{2,}|-$)/g, '-')
    .replace(/-$/, '')
    .substring(0, 32);

  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${configName || client.id}.conf"`
  );
  setHeader(event, 'Content-Type', 'text/plain');
  return config;
});
