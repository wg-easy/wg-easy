import {
  getRequestHost,
  getRequestIP,
  getRequestURL,
  type RequestEvent,
} from 'nuxt/server';

import { isTrustedProxy } from '#server/utils/trustedProxy';

export function getTrustedRequestHost(
  event: RequestEvent,
  trustedProxies: readonly string[]
): string {
  return getRequestHost(event, {
    xForwardedHost: isRequestFromTrustedProxy(event, trustedProxies),
  });
}

export function getTrustedRequestURL(
  event: RequestEvent,
  trustedProxies: readonly string[]
): URL {
  return getRequestURL(event, {
    xForwardedHost: isRequestFromTrustedProxy(event, trustedProxies),
    xForwardedProto: false,
  });
}

export function getTrustedRequestIP(
  event: RequestEvent,
  trustedProxies: readonly string[]
): string | undefined {
  return getRequestIP(event, {
    xForwardedFor: isRequestFromTrustedProxy(event, trustedProxies),
  });
}

function isRequestFromTrustedProxy(
  event: RequestEvent,
  trustedProxies: readonly string[]
): boolean {
  const remoteAddress = getRequestIP(event);
  return Boolean(
    remoteAddress && isTrustedProxy(remoteAddress, trustedProxies)
  );
}
