export default defineEventHandler(async (event) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(clientIdType)
  );
  await WireGuard.disableClient({ clientId });
  return { success: true };
});
