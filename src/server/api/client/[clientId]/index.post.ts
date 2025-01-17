export default definePermissionEventHandler(
  actions.CLIENT,
  async ({ event }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(clientIdType)
    );

    const data = await readValidatedBody(
      event,
      validateZod(clientUpdateType, event)
    );

    await WireGuard.updateClient({
      clientId,
      client: data,
    });

    return { success: true };
  }
);
