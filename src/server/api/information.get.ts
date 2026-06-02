import { gt } from 'semver';

export default defineEventHandler(async () => {
  let latestRelease: Awaited<ReturnType<typeof cachedFetchLatestRelease>>;
  if (WG_ENV.DISABLE_VERSION_CHECK) {
    latestRelease = { version: RELEASE, changelog: '' };
  } else {
    latestRelease = await cachedFetchLatestRelease();
  }

  const updateAvailable = gt(latestRelease.version, RELEASE);
  const insecure = WG_ENV.INSECURE;
  const isAwg = WG_ENV.WG_EXECUTABLE === 'awg';
  const wgInterface = await Database.interfaces.get();

  return {
    currentRelease: RELEASE,
    latestRelease: latestRelease,
    updateAvailable,
    insecure,
    isAwg,
    firewallEnabled: wgInterface.firewallEnabled,
  };
});
