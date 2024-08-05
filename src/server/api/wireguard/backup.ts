import WireGuard from '~/utils/WireGuard';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'GET');
  const config = await WireGuard.backupConfiguration();
  setHeader(event, 'Content-Disposition', 'attachment; filename="wg0.json"');
  setHeader(event, 'Content-Type', 'text/json');
  return config;
});
