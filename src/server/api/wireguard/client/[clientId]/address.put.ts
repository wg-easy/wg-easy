export default defineEventHandler(async (event) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(clientIdType)
  );
  const { address } = await readValidatedBody(event, validateZod(addressType));
  await WireGuard.updateClientAddress({ clientId, address });
  return { success: true };
});
