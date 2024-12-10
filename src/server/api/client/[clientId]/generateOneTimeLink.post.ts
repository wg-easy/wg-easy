export default defineEventHandler(async (event) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(clientIdType)
  );
  await WireGuard.generateOneTimeLink({ clientId });
  return { success: true };
});
