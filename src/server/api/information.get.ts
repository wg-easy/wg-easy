import { defineEventHandler } from 'h3';
import { gt } from 'semver';

import Database from '#server/utils/Database';
import { RELEASE, WG_ENV } from '#server/utils/config';
import { cachedFetchLatestRelease } from '#server/utils/release';

export default defineEventHandler(async () => {
  const insecure = WG_ENV.INSECURE;
  const isAwg = WG_ENV.WG_EXECUTABLE === 'awg';
  const wgInterface = await Database.interfaces.get();
  const release = await readLatestRelease();

  return {
    currentRelease: RELEASE,
    latestRelease: release.latestRelease,
    updateAvailable: release.updateAvailable,
    insecure,
    isAwg,
    firewallEnabled: wgInterface.firewallEnabled,
  };
});

async function readLatestRelease() {
  try {
    const latestRelease = await cachedFetchLatestRelease();
    return {
      latestRelease,
      updateAvailable: gt(latestRelease.version, RELEASE),
    };
  } catch {
    // GitHub being down must not hide firewall or Amnezia settings.
    return {
      latestRelease: {
        version: RELEASE,
        changelog: '',
      },
      updateAvailable: false,
    };
  }
}
