import { isIPv6 } from 'is-ip';

/**
 * WireGuard Endpoint host:port. IPv6 hosts need brackets.
 */
export function formatEndpoint(host: string, port: number): string {
  const bare =
    host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;

  if (isIPv6(bare)) {
    return `[${bare}]:${port}`;
  }

  return `${bare}:${port}`;
}
