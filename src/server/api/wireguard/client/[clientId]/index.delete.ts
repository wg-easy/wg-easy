export default defineEventHandler(async (event) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(clientIdType)
  );
  await WireGuard.deleteClient({ clientId });
  return { success: true };
});
