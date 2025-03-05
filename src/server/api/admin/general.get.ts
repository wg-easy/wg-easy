export default definePermissionEventHandler('admin', 'any', async () => {
  const generalConfig = await Database.general.getConfig();
  return generalConfig;
});
