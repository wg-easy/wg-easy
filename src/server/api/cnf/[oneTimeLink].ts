export default defineEventHandler(async (event) => {
  const system = await Database.system.get();
  if (!system.oneTimeLinks.enabled) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Invalid state',
    });
  }
  const { oneTimeLink } = await getValidatedRouterParams(
    event,
    validateZod(oneTimeLinkType)
  );
  const clients = await WireGuard.getClients();
  const client = clients.find(
    (client) => client.oneTimeLink?.oneTimeLink === oneTimeLink
  );
  if (!client) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Invalid One Time Link',
    });
  }
  const clientId = client.id;
  const config = await WireGuard.getClientConfiguration({ clientId });
  await WireGuard.eraseOneTimeLink({ clientId });
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${client.name}.conf"`
  );
  setHeader(event, 'Content-Type', 'text/plain');
  return config;
});
