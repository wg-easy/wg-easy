import WireGuard from '~/utils/WireGuard';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'GET');
  const clientId = getRouterParam(event, 'clientId');
  const client = await WireGuard.getClient({ clientId });
  const config = await WireGuard.getClientConfiguration({ clientId });
  const configName = client.name
    .replace(/[^a-zA-Z0-9_=+.-]/g, '-')
    .replace(/(-{2,}|-$)/g, '-')
    .replace(/-$/, '')
    .substring(0, 32);
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${configName || clientId}.conf"`
  );
  setHeader(event, 'Content-Type', 'text/plain');
  return config;
});
