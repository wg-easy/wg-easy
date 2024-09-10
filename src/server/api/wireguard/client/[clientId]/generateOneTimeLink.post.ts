export default defineEventHandler(async (event) => {
  const system = await Database.system.get();
  if (!system.oneTimeLinks.enabled) {
    throw createError({
      status: 404,
      message: 'Invalid state',
    });
  }
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(clientIdType)
  );
  await WireGuard.generateOneTimeLink({ clientId });
  return { success: true };
});
