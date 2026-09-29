import { randomBytes, randomInt } from 'node:crypto';

/** Only applied when initializing a new database, never to existing tunnels. */
export function createAwgDefaults() {
  const headers = new Set<string>();
  while (headers.size < 4) headers.add(String(randomInt(5, 2147483647)));
  const [h1, h2, h3, h4] = [...headers] as [string, string, string, string];

  return {
    h1,
    h2,
    h3,
    h4,
    s1: 128,
    s2: 56,
    s3: 12,
    s4: 12,
    headerProtectionKey: randomBytes(32).toString('base64'),
    contentPaddingAddition: '0-64',
    randomTrailers: true,
    disableCookies: true,
  };
}
