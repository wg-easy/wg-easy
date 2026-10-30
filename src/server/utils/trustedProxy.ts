import { containsCidr, normalizeCidr } from 'cidr-tools';
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

export function isTrustedProxy(
  address: string,
  trustedProxies: readonly string[]
): boolean {
  const normalizedAddress = normalizeIpAddress(address);
  if (!normalizedAddress || trustedProxies.length === 0) {
    return false;
  }

  return containsCidr(trustedProxies, normalizedAddress);
}
