import { containsCidr, normalizeCidr } from 'cidr-tools';
import { getRequestHost, getRequestIP, getRequestURL, type H3Event } from 'h3';
import isCidr from 'is-cidr';
import { isIP } from 'is-ip';

export function parseTrustedProxies(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (!isIP(entry) && !isCidr(entry)) {
        throw new Error(`Invalid trusted proxy: ${entry}`);
      }

      return normalizeIpAddress(entry) ?? normalizeCidr(entry);
    });
}

function normalizeIpAddress(address: string): string | undefined {
  const normalizedAddress = address.trim();
  if (!isIP(normalizedAddress)) {
    return undefined;
  }

  return normalizeCidr(normalizedAddress);
}

function isTrustedProxy(
  address: string,
  trustedProxies: readonly string[]
): boolean {
  const normalizedAddress = normalizeIpAddress(address);
  if (!normalizedAddress || trustedProxies.length === 0) {
    return false;
  }

  return containsCidr(trustedProxies, normalizedAddress);
}

export function getTrustedRequestHost(
  event: H3Event,
  trustedProxies: readonly string[]
): string {
  return getRequestHost(event, {
    xForwardedHost: isRequestFromTrustedProxy(event, trustedProxies),
  });
}

export function getTrustedRequestURL(
  event: H3Event,
  trustedProxies: readonly string[]
): URL {
  return getRequestURL(event, {
    xForwardedHost: isRequestFromTrustedProxy(event, trustedProxies),
    xForwardedProto: false,
  });
}

export function getTrustedRequestIP(
  event: H3Event,
  trustedProxies: readonly string[]
): string | undefined {
  return getRequestIP(event, {
    xForwardedFor: isRequestFromTrustedProxy(event, trustedProxies),
  });
}

function isRequestFromTrustedProxy(
  event: H3Event,
  trustedProxies: readonly string[]
): boolean {
  const remoteAddress = getRequestIP(event);
  return Boolean(
    remoteAddress && isTrustedProxy(remoteAddress, trustedProxies)
  );
}
