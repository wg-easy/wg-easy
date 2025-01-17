export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(
    event,
    validateZod(hooksUpdateType, event)
  );
  await Database.hooks.update(data);
  await WireGuard.saveConfig();
  return { success: true };
});
