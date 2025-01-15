export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(
    event,
    validateZod(hooksUpdateType, event)
  );
  await Database.system.updateHooks(data);
  return { success: true };
});
