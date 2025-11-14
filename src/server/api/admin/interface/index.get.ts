export default definePermissionEventHandler('admin', 'any', async () => {
  const wgInterface = await Database.interfaces.get();

  return {
    ...wgInterface,
    privateKey: undefined,
  };
});
