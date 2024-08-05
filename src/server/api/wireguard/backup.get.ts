export default defineEventHandler(async (event) => {
  const config = await WireGuard.backupConfiguration();
  setHeader(event, 'Content-Disposition', 'attachment; filename="wg0.json"');
  setHeader(event, 'Content-Type', 'text/json');
  return config;
});
