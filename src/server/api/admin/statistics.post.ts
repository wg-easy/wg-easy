export default defineEventHandler(async (event) => {
  const { statistics } = await readValidatedBody(
    event,
    validateZod(statisticsType)
  );
  await Database.system.updateStatistics(statistics);
  return { success: true };
});
