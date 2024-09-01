export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/json');
  const system = await Database.getSystem();
  if (!system)
    throw createError({
      statusCode: 500,
      statusMessage: 'Invalid',
    });

  return system.trafficStats.enabled;
});
