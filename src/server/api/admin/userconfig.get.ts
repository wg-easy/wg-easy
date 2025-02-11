export default definePermissionEventHandler(actions.ADMIN, async () => {
  const userConfig = await Database.userConfigs.get();
  return userConfig;
});
