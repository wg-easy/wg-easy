export default definePermissionEventHandler(actions.ADMIN, async () => {
  const generalConfig = await Database.general.getConfig();
  return generalConfig;
});
