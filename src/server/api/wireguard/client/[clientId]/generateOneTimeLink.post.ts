export default defineEventHandler(async (event) => {
  if (WG_ENABLE_ONE_TIME_LINKS === 'false') {
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
