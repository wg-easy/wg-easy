export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId');
  await WireGuard.deleteClient({ clientId });
  return { success: true };
});
