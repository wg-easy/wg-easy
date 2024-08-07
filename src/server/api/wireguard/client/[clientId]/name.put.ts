export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId');
  if (
    clientId === '__proto__' ||
    clientId === 'constructor' ||
    clientId === 'prototype'
  ) {
    throw createError({ statusCode: 403 });
  }
  const { name } = await readBody(event);
  await WireGuard.updateClientName({ clientId, name });
  return { success: true };
});
