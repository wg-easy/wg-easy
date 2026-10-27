import { describe, expect, test } from 'vitest';

import { formatEndpoint } from '#server/utils/endpoint';
import { ClientUpdateSchema } from '#shared/contracts/client';

describe('client server endpoint validation', () => {
  const schema = ClientUpdateSchema.shape.serverEndpoint;

  test.each([
    null,
    '203.0.113.10:51820',
    'vpn.example.com:51820',
    '[2001:db8::1]:51820',
  ])(
    'accepts an optional IPv4, hostname, or bracketed IPv6 endpoint: %s',
    (endpoint) => {
      expect(schema.parse(endpoint)).toBe(endpoint);
    }
  );

  test('requires an unambiguous host and numeric port', () => {
    for (const endpoint of [
      ':51820',
      'vpn.example.com',
      'vpn.example.com:udp',
      '2001:db8::1:51820',
    ]) {
      expect(schema.safeParse(endpoint).success, endpoint).toBe(false);
    }
  });

  test('bounds ports to 1–65535', () => {
    for (const [port, accepted] of [
      [0, false],
      [1, true],
      [65535, true],
      [65536, false],
    ] as const) {
      expect(schema.safeParse(`vpn.example.com:${port}`).success).toBe(
        accepted
      );
    }
  });
});

describe('formatEndpoint', () => {
  test('keeps IPv4 and hostnames unbracketed', () => {
    expect(formatEndpoint('203.0.113.10', 51820)).toBe('203.0.113.10:51820');
    expect(formatEndpoint('vpn.example.com', 51820)).toBe(
      'vpn.example.com:51820'
    );
  });

  test('wraps IPv6 hosts in brackets', () => {
    expect(formatEndpoint('2001:db8::1', 51820)).toBe('[2001:db8::1]:51820');
    expect(formatEndpoint('[2001:db8::1]', 51820)).toBe('[2001:db8::1]:51820');
  });
});
