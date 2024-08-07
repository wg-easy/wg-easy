export default defineEventHandler(async (event) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(clientIdType)
  );
  await WireGuard.enableClient({ clientId });
  return { success: true };
});
