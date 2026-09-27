import { describe, expect, test } from 'vitest';

import { formatEndpoint } from '#server/utils/endpoint';

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
