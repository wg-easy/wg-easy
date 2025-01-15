export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(
    event,
    validateZod(generalUpdateType, event)
  );
  await Database.system.updateGeneral(data);
  return { success: true };
});
