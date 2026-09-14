import type { IncomingMessage, ServerResponse } from 'node:http';

import { createEvent, type H3Event } from 'h3';
import { describe, expect, test } from 'vitest';

import {
  getTrustedRequestIP,
  getTrustedRequestHost,
  getTrustedRequestURL,
  parseTrustedProxies,
} from '#server/utils/trustedProxy';

describe('parseTrustedProxies', () => {
  test('returns no proxies when the setting is absent', () => {
    expect(parseTrustedProxies(undefined)).toEqual([]);
    expect(parseTrustedProxies('')).toEqual([]);
  });

  test('parses and normalizes IPv4 and IPv6 addresses and CIDRs', () => {
    expect(
      parseTrustedProxies(
        ' 192.0.2.1, 10.0.0.7/24, 2001:db8::1, 2001:db8:1::4/64 '
      )
    ).toEqual(['192.0.2.1', '10.0.0.0/24', '2001:db8::1', '2001:db8:1::/64']);
  });

  test('rejects invalid entries', () => {
    expect(() => parseTrustedProxies('10.0.0.1,proxy.local')).toThrow(
      'Invalid trusted proxy: proxy.local'
    );
  });
});

describe('trusted request helpers', () => {
  test('ignores forwarded headers supplied by an untrusted peer', () => {
    const event = createTestEvent('192.0.2.10', {
      host: 'wg-easy:51821',
      'x-forwarded-host': 'vpn.example.com',
      'x-forwarded-for': '198.51.100.25',
      'x-forwarded-proto': 'https',
    });

    expect(getTrustedRequestIP(event, ['10.0.0.0/8'])).toBe('192.0.2.10');
    expect(getTrustedRequestHost(event, ['10.0.0.0/8'])).toBe('wg-easy:51821');
    expect(getTrustedRequestURL(event, ['10.0.0.0/8']).origin).toBe(
      'http://wg-easy:51821'
    );
    expect(event.node.req.headers['x-forwarded-host']).toBe('vpn.example.com');
    expect(event.node.req.headers['x-forwarded-proto']).toBe('https');
  });

  test('uses host information from a trusted peer', () => {
    const event = createTestEvent('10.0.0.2', {
      host: 'wg-easy:51821',
      'x-forwarded-host': 'vpn.example.com:8443, wg-easy:51821',
      'x-forwarded-for': '198.51.100.25',
      'x-forwarded-proto': 'HTTPS, http',
    });

    expect(getTrustedRequestIP(event, ['10.0.0.0/8'])).toBe('198.51.100.25');
    expect(getTrustedRequestHost(event, ['10.0.0.0/8'])).toBe(
      'vpn.example.com:8443'
    );
    expect(getTrustedRequestURL(event, ['10.0.0.0/8']).origin).toBe(
      'http://vpn.example.com:8443'
    );
    expect(event.node.req.headers['x-forwarded-host']).toBe(
      'vpn.example.com:8443, wg-easy:51821'
    );
    expect(event.node.req.headers['x-forwarded-proto']).toBe('HTTPS, http');
  });

  test('returns undefined when no request address is available', () => {
    const event = createTestEvent(undefined, {});

    expect(getTrustedRequestIP(event, ['10.0.0.0/8'])).toBeUndefined();
  });
});

function createTestEvent(
  remoteAddress: string | undefined,
  headers: IncomingMessage['headers']
): H3Event {
  const request = {
    connection: {},
    headers: { ...headers },
    socket: { remoteAddress },
    url: '/api/auth/oidc/callback',
  } as unknown as IncomingMessage;

  return createEvent(request, {} as ServerResponse);
}
