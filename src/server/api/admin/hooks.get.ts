export default definePermissionEventHandler(actions.ADMIN, async () => {
  const hooks = await Database.hooks.get();
  return hooks;
});
