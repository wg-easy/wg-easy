import { gt } from 'semver';

export default defineEventHandler(async () => {
  // TODO: cache this
  const latestRelease = await fetchLatestRelease();
  const updateAvailable = gt(latestRelease.version, RELEASE);
  return {
    currentRelease: RELEASE,
    latestRelease: latestRelease,
    updateAvailable,
  };
});
