import WireGuard from '~/utils/WireGuard';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'DELETE');
  const clientId = getRouterParam(event, 'clientId');
  await WireGuard.deleteClient({ clientId });
  return { success: true };
});
