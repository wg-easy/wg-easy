export default definePermissionEventHandler(actions.ADMIN, async () => {
  const sessionConfig = await Database.general.getSessionConfig();
  return {
    sessionTimeout: sessionConfig.sessionTimeout,
  };
});
