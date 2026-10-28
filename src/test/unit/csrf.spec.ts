import { createApp, defineEventHandler, toWebHandler } from 'h3';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import csrf from '#server/middleware/csrf';
import { WG_ENV } from '#server/utils/config';

// Exercise Nitro's H3 version, not an unrelated hoisted dependency.
vi.mock('h3', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const nitroRequire = createRequire(require.resolve('nitropack/package.json'));
  return import(nitroRequire.resolve('h3'));
});

vi.mock('#server/utils/config', () => ({
  WG_ENV: { INSECURE: false, TRUSTED_PROXIES: [] },
}));

const origin = 'https://vpn.example.com';
const handler = vi.fn(() => ({ success: true }));
const app = toWebHandler(
  createApp().use(csrf).use(defineEventHandler(handler))
);

function request(
  headers: Record<string, string> = {},
  method = 'POST',
  path = '/api/client',
  url = origin,
  clientAddress?: string
) {
  return app(
    new Request(`${url}${path}`, {
      method,
      headers: { host: new URL(url).host, ...headers },
    }),
    { clientAddress }
  );
}

beforeEach(() => {
  handler.mockClear();
  WG_ENV.INSECURE = false;
  WG_ENV.TRUSTED_PROXIES = [];
});

describe('CSRF middleware', () => {
  test.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'allows same-origin %s requests through to the handler',
    async (method) => {
      const response = await request({ origin }, method);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true });
      expect(handler).toHaveBeenCalledOnce();
    }
  );

  test.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'rejects cross-origin %s requests before the handler runs',
    async (method) => {
      const response = await request(
        { origin: 'https://attacker.example.com' },
        method
      );
      expect(response.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    }
  );

  test.each([
    '/api/auth/password',
    '/api/auth/verify-2fa',
    '/api/auth/cancel',
    '/api/setup/2',
    '/api/setup/4',
    '/api/setup/migrate',
    '/api/admin/general',
    '/api/client/bulk',
    '/api/session',
    '/future-write-route',
  ])('protects %s even without a session', async (path) => {
    const response = await request({}, 'POST', path);
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  test.each([
    'null',
    '',
    'https://attacker.example.com',
    'https://vpn.example.com.attacker.test',
    'https://vpn.example.com@attacker.test',
    'http://vpn.example.com',
    'https://vpn.example.com:8443',
    'https://vpn.example.com/path',
    'https://vpn.example.com https://attacker.test',
  ])('rejects Origin %j even with a same-origin Referer', async (value) => {
    const response = await request({ origin: value, referer: `${origin}/` });
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  test('uses Referer when Origin is absent', async () => {
    const response = await request({ referer: `${origin}/clients?page=2` });
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  test.each([
    '',
    'null',
    '/clients',
    'https://attacker.example.com/clients',
    'https://vpn.example.com.attacker.test/',
    'https://vpn.example.com@attacker.test/',
    'http://vpn.example.com/clients',
    'https://vpn.example.com:8443/clients',
  ])('rejects Referer %j when Origin is absent', async (referer) => {
    const response = await request({ referer });
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  test.each<Record<string, string>>([
    { cookie: 'wg-easy=session' },
    { authorization: 'Basic dXNlcjpwYXNzd29yZA==' },
    { cookie: 'wg-easy=session', authorization: 'Basic dXNlcjpwYXNzd29yZA==' },
  ])(
    'does not exempt credentials from origin validation: %j',
    async (headers) => {
      const response = await request(headers, 'DELETE', '/api/session');
      expect(response.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    }
  );

  test.each([
    'application/x-www-form-urlencoded',
    'multipart/form-data; boundary=csrf',
    'text/plain',
    'application/json',
  ])('rejects cross-origin submissions with %s', async (contentType) => {
    const response = await request({
      origin: 'https://attacker.test',
      'content-type': contentType,
    });
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  test.each(['GET', 'HEAD', 'OPTIONS'])(
    'allows %s without requiring origin headers',
    async (method) => {
      expect((await request({}, method)).status).toBe(200);
      expect(handler).toHaveBeenCalledOnce();
    }
  );

  test.each(['/api/auth/oidc/callback', '/api/auth/oidc/link'])(
    'leaves %s to OAuth state validation',
    async (path) => {
      const response = await request(
        { origin: 'https://identity.example.com' },
        'GET',
        `${path}?code=code&state=state`
      );
      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalledOnce();
    }
  );
});

describe('CSRF deployment origins', () => {
  test('supports HTTP when INSECURE is enabled', async () => {
    WG_ENV.INSECURE = true;
    const url = 'http://localhost:51821';
    expect(
      (await request({ origin: url }, 'POST', '/api/client', url)).status
    ).toBe(200);
    expect(
      (
        await request(
          { origin: 'https://localhost:51821' },
          'POST',
          '/api/client',
          url
        )
      ).status
    ).toBe(403);
  });

  test.each(['https://vpn.example.com:8443', 'https://[2001:db8::1]:8443'])(
    'compares the complete origin for %s',
    async (url) => {
      expect(
        (await request({ origin: url }, 'POST', '/api/client', url)).status
      ).toBe(200);
    }
  );

  test('uses the public host from a trusted proxy and the configured protocol', async () => {
    WG_ENV.TRUSTED_PROXIES = ['10.0.0.0/8'];
    const response = await request(
      {
        origin: 'https://vpn.example.com:8443',
        'x-forwarded-host': 'vpn.example.com:8443, wg-easy:51821',
        'x-forwarded-proto': 'http',
      },
      'POST',
      '/api/client',
      'http://wg-easy:51821',
      '10.0.0.2'
    );
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  test('ignores forged forwarding headers from an untrusted peer', async () => {
    WG_ENV.TRUSTED_PROXIES = ['10.0.0.0/8'];
    const response = await request(
      {
        origin: 'https://attacker.test',
        'x-forwarded-host': 'attacker.test',
        'x-forwarded-for': '10.0.0.2',
        'x-forwarded-proto': 'https',
      },
      'POST',
      '/api/client',
      origin,
      '192.0.2.1'
    );
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});
