export default definePermissionEventHandler(actions.ADMIN, async () => {
  const userConfig = await Database.userConfigs.get('wg0');
  if (!userConfig) {
    throw new Error('User config not found');
  }
  return userConfig;
});
