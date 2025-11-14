export default definePermissionEventHandler('admin', 'any', async () => {
  const generalConfig = await Database.general.getConfig();
  const generalConfigWithOverrides = applyGeneralOverrides(generalConfig);
  return generalConfigWithOverrides;
});
