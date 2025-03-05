export default definePermissionEventHandler('admin', 'any', async () => {
  const hooks = await Database.hooks.get();
  return hooks;
});
