import { getRequestIP, getRequestURL, type RequestEvent } from 'nuxt/server';

import { isTrustedProxy } from '#server/utils/trustedProxy';

export function getTrustedRequestURL(
  event: RequestEvent,
  trustedProxies: readonly string[],
  fallbackProtocol: 'http' | 'https'
): URL {
  const trusted = isRequestFromTrustedProxy(event, trustedProxies);
  const forwardedProtocol = trusted
    ? event.req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
    : undefined;
  const url = getRequestURL(event, {
    xForwardedHost: trusted,
    xForwardedProto: trusted,
  });
  // Keep the legacy scheme for missing, invalid, or untrusted headers.
  if (forwardedProtocol !== 'http' && forwardedProtocol !== 'https') {
    url.protocol = `${fallbackProtocol}:`;
  }
  return url;
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
