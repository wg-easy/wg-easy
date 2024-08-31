export default defineEventHandler(async (event) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(clientIdType)
  );
  const { expireDate } = await readValidatedBody(
    event,
    validateZod(expireDateType)
  );
  await WireGuard.updateClientExpireDate({
    clientId,
    expireDate,
  });
  return { success: true };
});
