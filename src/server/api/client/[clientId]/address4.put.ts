export default defineEventHandler(async (event) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(clientIdType)
  );
  const { address4 } = await readValidatedBody(
    event,
    validateZod(address4Type)
  );
  await WireGuard.updateClientAddress({ clientId, address4 });
  return { success: true };
});
