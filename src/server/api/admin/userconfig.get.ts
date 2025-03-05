export default definePermissionEventHandler('admin', 'any', async () => {
  const userConfig = await Database.userConfigs.get();
  return userConfig;
});
