export default defineEventHandler(async (event) => {
  if (WG_ENABLE_ONE_TIME_LINKS === 'false') {
    throw createError({
      status: 404,
      message: 'Invalid state',
    });
  }
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
