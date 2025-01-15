export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(
    event,
    validateZod(userConfigUpdateType, event)
  );
  await Database.system.updateUserConfig(data);
  await WireGuard.saveConfig();
  return { success: true };
});
