import WireGuard from '~/utils/WireGuard';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');
  const clientId = getRouterParam(event, 'clientId');
  if (
    clientId === '__proto__' ||
    clientId === 'constructor' ||
    clientId === 'prototype'
  ) {
    throw createError({ status: 403 });
  }
  await WireGuard.disableClient({ clientId });
  return { success: true };
});
