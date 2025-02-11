export default definePermissionEventHandler(actions.ADMIN, async () => {
  const wgInterface = await Database.interfaces.get();

  return {
    ...wgInterface,
    privateKey: undefined,
  };
});
