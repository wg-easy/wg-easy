export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/json');
  const system = await Database.getSystem();
  if (!system)
    throw createError({
      statusCode: 500,
      statusMessage: 'Invalid',
    });

  const number = system.trafficStats.type;
  if (Number.isNaN(number)) {
    return 0;
  }
  return number;
});
