import type { H3Event } from 'h3';

import { WG_ENV } from '#server/utils/config';
import { getTrustedRequestIP } from '#server/utils/trustedProxy';

type SecurityEvent = 'password' | '2fa' | 'one-time-link';

export function logSecurityEvent(
  event: H3Event,
  type: SecurityEvent,
  username?: string
) {
  const user = username ? ` username=${JSON.stringify(username)}` : '';
  const ip = getTrustedRequestIP(event, WG_ENV.TRUSTED_PROXIES) ?? 'unknown';

  console.warn(`Security failure: type=${type}${user} ip=${ip}`);
}
