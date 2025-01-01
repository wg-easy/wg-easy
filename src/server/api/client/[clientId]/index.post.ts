export default defineEventHandler(async (event) => {
  const { clientId } = await getValidatedRouterParams(
    event,
    validateZod(clientIdType)
  );
  const data = await readValidatedFormData(
    event,
    validateZod(clientUpdateType, event)
  );
  await WireGuard.updateClient({
    clientId,
    client: { ...data, expiresAt: data.expiresAt ?? null },
  });
  return;
});
