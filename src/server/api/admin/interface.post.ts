export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(
    event,
    validateZod(interfaceUpdateType, event)
  );
  await Database.system.updateInterface(data);
  await WireGuard.saveConfig();
  return { success: true };
});
