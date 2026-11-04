import type { RequestEvent } from 'nuxt/server';

import { WG_ENV } from '#server/utils/config';
import { getTrustedRequestIP } from '#server/http/request';

type SecurityEvent = 'password' | 'basic' | '2fa' | 'one-time-link';

export function logSecurityEvent(
  event: RequestEvent,
  type: SecurityEvent,
  username?: string
) {
  const user = username ? ` username=${JSON.stringify(username)}` : '';
  const ip = getTrustedRequestIP(event, WG_ENV.TRUSTED_PROXIES) ?? 'unknown';

  console.warn(`Security failure: type=${type}${user} ip=${ip}`);
}
