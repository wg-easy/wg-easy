export default defineEventHandler(async (event) => {
  const system = await Database.getSystem();
  if (!system)
    throw createError({
      statusCode: 500,
      statusMessage: 'Invalid',
    });
  if (!system.oneTimeLinks.enabled) {
    throw createError({
      status: 404,
      message: 'Invalid state',
    });
  }
  // TODO: validate with zod
  const clientOneTimeLink = getRouterParam(event, 'clientOneTimeLink');
  const clients = await WireGuard.getClients();
  const client = clients.find(
    (client) => client.oneTimeLink === clientOneTimeLink
  );
  if (!client) return;
  const clientId = client.id;
  const config = await WireGuard.getClientConfiguration({ clientId });
  await WireGuard.eraseOneTimeLink({ clientId });
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${clientOneTimeLink}.conf"`
  );
  setHeader(event, 'Content-Type', 'text/plain');
  return config;
});
