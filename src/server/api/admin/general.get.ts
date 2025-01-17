export default defineEventHandler(async () => {
  const sessionConfig = await Database.general.getSessionConfig();
  return {
    sessionTimeout: sessionConfig.sessionTimeout,
  };
});
