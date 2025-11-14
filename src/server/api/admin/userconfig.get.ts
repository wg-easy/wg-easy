export default definePermissionEventHandler('admin', 'any', async () => {
  const userConfig = await Database.userConfigs.get();
  const userConfigWithOverrides = applyUserConfigOverrides(userConfig);
  return userConfigWithOverrides;
});
