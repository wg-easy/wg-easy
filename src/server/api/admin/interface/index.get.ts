export default definePermissionEventHandler('admin', 'any', async () => {
  const wgInterface = await Database.interfaces.get();
  const wgInterfaceWithOverrides = applyInterfaceOverrides(wgInterface);

  return {
    ...wgInterfaceWithOverrides,
    privateKey: undefined,
  };
});
