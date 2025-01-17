export default definePermissionEventHandler(
  actions.CLIENT,
  async ({ event }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(clientIdType)
    );
    return WireGuard.getClient({ clientId });
  }
);
