export default defineEventHandler(async () => {
  const system = await Database.getSystem();
  if (!system)
    throw createError({
      statusCode: 500,
      statusMessage: 'Invalid',
    });

  const latestRelease = await fetchLatestRelease();
  return {
    currentRelease: system.release,
    latestRelease: latestRelease,
  };
});
