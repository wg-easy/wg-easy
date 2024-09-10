import { gt } from 'semver';

export default defineEventHandler(async () => {
  const latestRelease = await cachedFetchLatestRelease();
  const updateAvailable = gt(latestRelease.version, RELEASE);
  return {
    currentRelease: RELEASE,
    latestRelease: latestRelease,
    updateAvailable,
  };
});
