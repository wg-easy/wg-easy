export default defineEventHandler(async () => {
  const latestRelease = await fetchLatestRelease();
  return {
    currentRelease: RELEASE,
    latestRelease: latestRelease,
  };
});
