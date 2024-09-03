export default defineEventHandler(async () => {
  const system = await Database.getSystem();
  const latestRelease = await fetchLatestRelease();
  return {
    currentRelease: system.release,
    latestRelease: latestRelease,
  };
});
