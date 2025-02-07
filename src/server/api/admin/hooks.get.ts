export default definePermissionEventHandler(actions.ADMIN, async () => {
  const hooks = await Database.hooks.get('wg0');
  if (!hooks) {
    throw new Error('Hooks not found');
  }
  return hooks;
});
