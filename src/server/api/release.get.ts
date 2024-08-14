export default defineEventHandler(async () => {
  const release = Number.parseInt(RELEASE, 10);
  const latestRelease = await fetchLatestRelease();
  return {
    currentRelease: release,
    latestRelease: latestRelease,
  };
});
