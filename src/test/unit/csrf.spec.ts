import { beforeEach, describe, expect, test, vi } from 'vitest';

import { requestEvent } from '../helpers/request';

import csrf from '#server/middleware/csrf';
import { WG_ENV } from '#server/utils/config';

vi.mock('#server/utils/config', () => ({
  WG_ENV: { INSECURE: false, TRUSTED_PROXIES: [] },
}));

const origin = 'https://vpn.example.com';
const forbidden = { status: 403, statusText: 'Invalid request origin' };

async function check(
  headers: Record<string, string> = {},
  method = 'POST',
  url = `${origin}/api/auth/password`,
  clientAddress?: string
) {
  return csrf(
    requestEvent(
      url,
      { method, headers: { host: new URL(url).host, ...headers } },
      clientAddress
    )
  );
}

beforeEach(() => {
  WG_ENV.INSECURE = false;
  WG_ENV.TRUSTED_PROXIES = ['10.0.0.0/8'];
});

describe('CSRF activation', () => {
  test.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'skips %s origin checks when no trusted proxies are configured',
    async (method) => {
      WG_ENV.TRUSTED_PROXIES = [];
      await expect(check({}, method)).resolves.toBeUndefined();
      await expect(
        check(
          {
            origin: 'https://attacker.example',
            cookie: 'wg-easy=session',
            authorization: 'Basic dXNlcjpwYXNzd29yZA==',
          },
          method
        )
      ).resolves.toBeUndefined();
    }
  );

  test('enforces origins on direct requests when enabled', async () => {
    const url = `${origin}/api/client`;
    await expect(check({}, 'POST', url, '192.0.2.1')).rejects.toMatchObject(
      forbidden
    );
    await expect(
      check({ origin }, 'POST', url, '192.0.2.1')
    ).resolves.toBeUndefined();
  });
});

describe('CSRF middleware', () => {
  test.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'requires a matching origin for %s',
    async (method) => {
      await expect(check({ origin }, method)).resolves.toBeUndefined();
      await expect(
        check({ origin: 'https://attacker.example' }, method)
      ).rejects.toMatchObject(forbidden);
    }
  );

  test.each(['GET', 'HEAD', 'OPTIONS'])(
    'allows %s without requiring origin headers',
    async (method) => {
      await expect(check({}, method)).resolves.toBeUndefined();
    }
  );

  test('protects unauthenticated writes on arbitrary routes', async () => {
    await expect(
      check({}, 'POST', `${origin}/future-write-route`)
    ).rejects.toMatchObject(forbidden);
  });

  test.each(['', 'null', 'https://attacker.example'])(
    'does not let a valid Referer override Origin %j',
    async (value) => {
      await expect(
        check({ origin: value, referer: `${origin}/` })
      ).rejects.toMatchObject(forbidden);
    }
  );

  test('uses only the Referer origin when Origin is absent', async () => {
    await expect(
      check({ referer: `${origin}/clients?page=2` })
    ).resolves.toBeUndefined();
    await expect(check({ referer: '/clients' })).rejects.toMatchObject(
      forbidden
    );
    await expect(
      check({ referer: 'https://attacker.example/clients' })
    ).rejects.toMatchObject(forbidden);
  });

  test.each([
    'https://vpn.example.com.attacker.test',
    'http://vpn.example.com',
    'https://vpn.example.com:8443',
  ])('compares the complete origin against %s', async (value) => {
    await expect(check({ origin: value })).rejects.toMatchObject(forbidden);
  });

  test('credentials and JSON content do not bypass origin validation', async () => {
    await expect(
      check({
        origin: 'https://attacker.example',
        cookie: 'wg-easy=session',
        authorization: 'Basic dXNlcjpwYXNzd29yZA==',
        'content-type': 'application/json',
      })
    ).rejects.toMatchObject(forbidden);
  });
});

describe('CSRF deployment origins', () => {
  test('falls back to HTTP when INSECURE is enabled without a trusted protocol', async () => {
    WG_ENV.INSECURE = true;
    const url = 'http://localhost:51821/api/client';
    await expect(
      check({ origin: 'http://localhost:51821' }, 'POST', url)
    ).resolves.toBeUndefined();
    await expect(
      check({ origin: 'https://localhost:51821' }, 'POST', url)
    ).rejects.toMatchObject(forbidden);
  });

  test.each([
    { protocol: 'https', insecure: true },
    { protocol: 'http', insecure: false },
  ])(
    'uses trusted $protocol with INSECURE=$insecure',
    async ({ protocol, insecure }) => {
      WG_ENV.INSECURE = insecure;
      const publicOrigin = `${protocol}://vpn.example.com:8443`;
      const headers = {
        'x-forwarded-host': 'vpn.example.com:8443, wg-easy:51821',
        'x-forwarded-proto': protocol,
      };
      const url = 'http://wg-easy:51821/api/client';
      await expect(
        check({ ...headers, origin: publicOrigin }, 'POST', url, '10.0.0.2')
      ).resolves.toBeUndefined();
      const wrongOrigin = `${insecure ? 'http' : 'https'}://vpn.example.com:8443`;
      await expect(
        check({ ...headers, origin: wrongOrigin }, 'POST', url, '10.0.0.2')
      ).rejects.toMatchObject(forbidden);
    }
  );

  test('does not allow an untrusted peer to override the origin scheme', async () => {
    const url = `${origin}/api/client`;
    await expect(
      check(
        { 'x-forwarded-proto': 'http', origin: 'http://vpn.example.com' },
        'POST',
        url,
        '192.0.2.1'
      )
    ).rejects.toMatchObject(forbidden);
    await expect(
      check({ 'x-forwarded-proto': 'http', origin }, 'POST', url, '192.0.2.1')
    ).resolves.toBeUndefined();
  });

  test('does not let an untrusted peer declare itself a trusted proxy', async () => {
    await expect(
      check(
        {
          origin: 'https://attacker.test',
          'x-forwarded-host': 'attacker.test',
          'x-forwarded-for': '10.0.0.2',
          'x-forwarded-proto': 'https',
        },
        'POST',
        `${origin}/api/client`,
        '192.0.2.1'
      )
    ).rejects.toMatchObject(forbidden);
  });
});
