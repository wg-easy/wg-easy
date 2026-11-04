import { isGreaterThan } from 'verkit';

import { getDatabase } from '#db';
import { RELEASE, WG_ENV } from '#server/utils/config';
import { getIpInformation } from '#server/utils/ip';
import { cachedFetchLatestRelease } from '#server/utils/release';
import { authorize } from '#server/features/authorization';
import type { Actor } from '#shared/contracts/identity';

export async function information() {
  const latestRelease = await cachedFetchLatestRelease().catch(() => ({
    version: RELEASE,
    changelog: '',
  }));
  const network = await getDatabase().interfaces.get();
  return {
    currentRelease: RELEASE,
    latestRelease,
    updateAvailable: isGreaterThan(latestRelease.version, RELEASE),
    insecure: WG_ENV.INSECURE,
    isAwg: WG_ENV.WG_EXECUTABLE === 'awg',
    firewallEnabled: network.firewallEnabled,
  };
}

export async function ipInformation(actor: Actor) {
  authorize(actor, 'admin', 'any');
  return getIpInformation((await getDatabase().interfaces.get()).name);
}
