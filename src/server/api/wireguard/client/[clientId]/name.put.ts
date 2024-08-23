export default defineEventHandler(async (event) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(clientIdType)
  );
  const { name } = await readValidatedBody(event, validateZod(nameType));
  await WireGuard.updateClientName({ clientId, name });
  return { success: true };
});
