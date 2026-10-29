import { describe, expect, test } from 'vitest';

import { requestEvent } from '../helpers/request';

import { parseTrustedProxies } from '#server/utils/trustedProxy';
import {
  getTrustedRequestIP,
  getTrustedRequestURL,
} from '#server/http/request';

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
    expect(getTrustedRequestURL(event, ['10.0.0.0/8'], 'http').origin).toBe(
      'http://wg-easy:51821'
    );
    expect(event.req.headers.get('x-forwarded-host')).toBe('vpn.example.com');
    expect(event.req.headers.get('x-forwarded-proto')).toBe('https');
  });

  test('uses the public host and protocol from a trusted peer', () => {
    const event = createTestEvent('10.0.0.2', {
      host: 'wg-easy:51821',
      'x-forwarded-host': 'vpn.example.com:8443, wg-easy:51821',
      'x-forwarded-for': '198.51.100.25',
      'x-forwarded-proto': 'https, http',
    });

    expect(getTrustedRequestIP(event, ['10.0.0.0/8'])).toBe('198.51.100.25');
    expect(getTrustedRequestURL(event, ['10.0.0.0/8'], 'http').origin).toBe(
      'https://vpn.example.com:8443'
    );
    expect(event.req.headers.get('x-forwarded-host')).toBe(
      'vpn.example.com:8443, wg-easy:51821'
    );
    expect(event.req.headers.get('x-forwarded-proto')).toBe('https, http');
  });

  test.each(['http', 'https'] as const)(
    'preserves the %s fallback without a valid trusted protocol',
    (fallback) => {
      for (const protocol of [undefined, '', 'ftp', 'invalid, https']) {
        const event = createTestEvent('10.0.0.2', {
          'x-forwarded-host': 'vpn.example.com',
          ...(protocol === undefined ? {} : { 'x-forwarded-proto': protocol }),
        });
        expect(
          getTrustedRequestURL(event, ['10.0.0.0/8'], fallback).origin
        ).toBe(`${fallback}://vpn.example.com`);
      }
    }
  );

  test.each(['192.0.2.10', undefined])(
    'ignores forwarded protocol with untrusted or unknown source %s',
    (address) => {
      const event = createTestEvent(address, {
        'x-forwarded-proto': 'http',
        'x-forwarded-for': '10.0.0.2',
      });
      expect(getTrustedRequestURL(event, ['10.0.0.0/8'], 'https').origin).toBe(
        'https://wg-easy:51821'
      );
    }
  );

  test('ignores forwarded protocol when no proxies are configured', () => {
    const event = createTestEvent('10.0.0.2', { 'x-forwarded-proto': 'http' });
    expect(getTrustedRequestURL(event, [], 'https').origin).toBe(
      'https://wg-easy:51821'
    );
  });

  test('returns undefined when no request address is available', () => {
    const event = createTestEvent(undefined, {});

    expect(getTrustedRequestIP(event, ['10.0.0.0/8'])).toBeUndefined();
  });
});

function createTestEvent(
  remoteAddress: string | undefined,
  headers: Record<string, string>
) {
  return requestEvent(
    'http://wg-easy:51821/api/auth/oidc/callback',
    { headers },
    remoteAddress
  );
}
