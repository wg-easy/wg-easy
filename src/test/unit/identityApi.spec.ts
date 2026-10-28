import type { RequestEvent } from 'nuxt/server';
import { beforeEach, onTestFinished, describe, expect, test, vi } from 'vitest';
import * as oauthClient from 'openid-client';

import { requestEvent } from '../helpers/request';
import { databaseFixture } from '../helpers/database';
import { resetCryptoMocks } from '../helpers/crypto';

import { getCurrentUser } from '#server/features/identity/session';
import passwordLogin from '#server/api/auth/password.post';
import verifySecondFactor from '#server/api/auth/verify-2fa.post';
import sessionUser from '#server/api/session.get';
import logout from '#server/api/session.delete';
import pendingLogin from '#server/api/auth/pending.get';
import cancelLogin from '#server/api/auth/cancel.post';
import { WG_ENV } from '#server/utils/config';
import { roles } from '#shared/utils/permissions';
import generalSettings from '#server/api/admin/general.get';
import interfaceSettings from '#server/api/admin/interface/index.get';
import hooks from '#server/api/admin/hooks.get';
import userConfig from '#server/api/admin/userconfig.get';
import ipInformation from '#server/api/admin/ip-info.get';
import { getIpInformation } from '#server/utils/ip';
import beginOAuth from '#server/api/auth/[provider]/index.get';
import oauthCallback from '#server/api/auth/[provider]/callback.get';
import oauthLink from '#server/api/auth/[provider]/link.get';
import { logSecurityEvent } from '#server/utils/securityLogger';

vi.mock('#server/utils/ip', async (original) => ({
  ...(await original<typeof import('#server/utils/ip')>()),
  getIpInformation: vi.fn(),
}));

vi.mock('#server/utils/config', () => ({
  WG_ENV: { INSECURE: false, OAUTH_PROVIDERS: ['oidc'], TRUSTED_PROXIES: [] },
  OAUTH_PROVIDERS: {
    oidc: {
      server: 'https://identity.example.com',
      clientId: 'test-client',
      clientSecret: 'test-secret',
      scope: 'openid email profile',
      params: {},
    },
  },
  isValidOauthProvider: (provider: string) => provider === 'oidc',
  SERVER_DEBUG: vi.fn(),
}));
vi.mock('openid-client', async (original) => ({
  ...(await original<typeof import('openid-client')>()),
  discovery: vi.fn(async () => ({})),
  randomPKCECodeVerifier: vi.fn(() => 'verifier'),
  calculatePKCECodeChallenge: vi.fn(async () => 'challenge'),
  randomNonce: vi.fn(() => 'nonce'),
  randomState: vi.fn(() => 'state'),
  buildAuthorizationUrl: vi.fn((_config, params: Record<string, string>) => {
    const url = new URL('https://identity.example.com/authorize');
    url.search = new URLSearchParams(params).toString();
    return url;
  }),
  authorizationCodeGrant: vi.fn(async () => ({
    access_token: 'token',
    claims: () => ({ sub: 'external-user' }),
  })),
  fetchUserInfo: vi.fn(async () => ({
    sub: 'external-user',
    email: 'admin@example.com',
    email_verified: true,
  })),
}));
vi.mock('#server/utils/securityLogger', () => ({ logSecurityEvent: vi.fn() }));
vi.mock('#server/http/translation', () => ({
  useRequestTranslation: () => (key: string) => key,
}));

let fixture: Awaited<ReturnType<typeof databaseFixture>>;
let now: number;

function request(path: string, body?: unknown, cookie = '') {
  return requestEvent(`https://localhost${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', host: 'localhost', cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function sessionCookie(event: RequestEvent) {
  const cookies = event.res.headers.getSetCookie();
  const session = cookies.find((cookie) => cookie.startsWith('wg-easy='));
  expect(session).toBeDefined();
  return session!.split(';')[0]!;
}

const credentials = {
  username: 'admin',
  password: 'a-long-password',
  remember: true,
};

beforeEach(async () => {
  vi.resetAllMocks();
  WG_ENV.INSECURE = false;
  fixture = await databaseFixture();
  now = Date.now();
  resetCryptoMocks();
  const clock = vi.spyOn(Date, 'now').mockImplementation(() => now);
  onTestFinished(() => clock.mockRestore());
  await fixture.store.users.insert({
    id: 1,
    username: credentials.username,
    password: 'hash:a-long-password',
    name: 'Administrator',
    role: roles.ADMIN,
    enabled: true,
    totpVerified: false,
  });
});

describe('identity HTTP contract', () => {
  function basicRequest(password: string) {
    return requestEvent('https://localhost/api/admin/general', {
      headers: {
        authorization: `Basic ${Buffer.from(`${credentials.username}:${password}`).toString('base64')}`,
      },
    });
  }

  test('logs rejected Basic credentials', async () => {
    const event = basicRequest('wrong');
    await expect(getCurrentUser(event)).rejects.toMatchObject({
      status: 401,
    });
    expect(logSecurityEvent).toHaveBeenCalledExactlyOnceWith(
      event,
      'basic',
      'admin'
    );
  });

  test('does not log successful Basic authentication as a failure', async () => {
    await expect(
      getCurrentUser(basicRequest(credentials.password))
    ).resolves.toMatchObject({ id: 1 });
    expect(logSecurityEvent).not.toHaveBeenCalled();
  });

  test('logs disabled accounts rejected by Basic authentication', async () => {
    await fixture.store.users.update(1, { enabled: false });
    const event = basicRequest(credentials.password);
    await expect(getCurrentUser(event)).rejects.toMatchObject({
      status: 403,
    });
    expect(logSecurityEvent).toHaveBeenCalledExactlyOnceWith(
      event,
      'basic',
      'admin'
    );
  });

  test.each([
    ['general', generalSettings],
    ['interface', interfaceSettings],
    ['hooks', hooks],
    ['userconfig', userConfig],
    ['ip-info', ipInformation],
  ] as const)('protects the %s admin route', async (path, handler) => {
    await expect(handler(request(`/api/admin/${path}`))).rejects.toMatchObject({
      status: 401,
    });
    await fixture.store.users.update(1, { role: roles.CLIENT });
    const login = request('/api/auth/password', credentials);
    await passwordLogin(login);
    await expect(
      handler(request(`/api/admin/${path}`, undefined, sessionCookie(login)))
    ).rejects.toMatchObject({ status: 403 });
    expect(getIpInformation).not.toHaveBeenCalled();
  });

  test('authenticates with a session cookie and returns only public account fields', async () => {
    const login = request('/api/auth/password', credentials);
    expect(await passwordLogin(login)).toEqual({ status: 'success' });
    const cookie = sessionCookie(login);
    const user = await sessionUser(request('/api/session', undefined, cookie));
    expect(user).toEqual({
      id: 1,
      username: 'admin',
      name: 'Administrator',
      email: null,
      role: roles.ADMIN,
      totpVerified: false,
      oauthProvider: null,
      hasPassword: true,
    });
    expect(await getCurrentUser(request('/api/me', undefined, cookie))).toEqual(
      user
    );
  });

  test('returns general settings without exposing the session signing secret', async () => {
    const settings = {
      sessionTimeout: 3600,
      metricsPrometheus: true,
      metricsJson: false,
      metricsPassword: 'hash:metrics',
    };
    await fixture.store.general.update(settings);
    const login = request('/api/auth/password', credentials);
    await passwordLogin(login);
    expect(
      await generalSettings(
        request('/api/admin/general', undefined, sessionCookie(login))
      )
    ).toEqual(settings);
  });

  test.each([true, false])(
    'sets cookie lifetime for remember=%s and expires remembered session data',
    async (remember) => {
      const sessionTimeout = 3600;
      await fixture.store.general.update({ sessionTimeout });
      const login = request('/api/auth/password', { ...credentials, remember });
      await passwordLogin(login);
      const cookie = sessionCookie(login);
      const header = login.res.headers.get('set-cookie');
      if (remember) expect(header).toContain(`Max-Age=${sessionTimeout}`);
      else {
        expect(header).not.toContain('Max-Age=');
        expect(header).not.toContain('Expires=');
      }

      // Advance beyond the sealing library's clock-skew allowance too.
      now += (sessionTimeout + 61) * 1000;
      const read = sessionUser(request('/api/session', undefined, cookie));
      if (remember) await expect(read).rejects.toMatchObject({ status: 401 });
      else await expect(read).resolves.toMatchObject({ id: 1 });
    }
  );

  test('preserves an immediately expired cookie when the remembered timeout is zero', async () => {
    await fixture.store.general.update({ sessionTimeout: 0 });
    const login = request('/api/auth/password', credentials);
    await passwordLogin(login);
    expect(login.res.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  test('rejects an unusable cookie and replaces it on successful login', async () => {
    const invalid = 'wg-easy=invalid';
    await expect(
      sessionUser(request('/api/session', undefined, invalid))
    ).rejects.toMatchObject({ status: 401 });
    const login = request('/api/auth/password', credentials, invalid);
    expect(await passwordLogin(login)).toEqual({ status: 'success' });
    await expect(
      sessionUser(request('/api/session', undefined, sessionCookie(login)))
    ).resolves.toMatchObject({ id: 1 });
  });

  test.each([false, true])(
    'sets the login cookie policy for INSECURE=%s',
    async (insecure) => {
      WG_ENV.INSECURE = insecure;
      const login = request('/api/auth/password', credentials);
      await passwordLogin(login);
      const cookies = login.res.headers
        .getSetCookie()
        .filter((value) => value.startsWith('wg-easy='));
      expect(cookies).toHaveLength(1);
      expect(cookies[0]).toContain('HttpOnly');
      expect(cookies[0]).toContain('SameSite=Lax');
      expect(cookies[0]).toContain('Path=/');
      expect(cookies[0]?.includes('Secure')).toBe(!insecure);
    }
  );

  test('logs out by clearing session data and expiring the cookie', async () => {
    const login = request('/api/auth/password', credentials);
    await passwordLogin(login);
    const event = request('/api/session', undefined, sessionCookie(login));
    expect(await logout(event)).toEqual({ success: true });
    const cleared = sessionCookie(event);
    expect(cleared).toBe('wg-easy=');
    expect(event.res.headers.get('set-cookie')).toContain('Max-Age=0');
    await expect(
      sessionUser(request('/api/session', undefined, cleared))
    ).rejects.toMatchObject({ status: 401 });
  });

  test('requires the second factor even with an existing session, then preserves remember-me', async () => {
    const previous = request('/api/auth/password', credentials);
    await passwordLogin(previous);
    await fixture.store.users.update(1, {
      totpVerified: true,
      totpKey: 'secret',
    });
    const login = request(
      '/api/auth/password',
      credentials,
      sessionCookie(previous)
    );
    expect(await passwordLogin(login)).toEqual({ status: 'TOTP_REQUIRED' });
    const cookie = sessionCookie(login);
    expect(
      await pendingLogin(request('/api/auth/pending', undefined, cookie))
    ).toEqual({ type: 'password' });
    await expect(
      sessionUser(request('/api/session', undefined, cookie))
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      getCurrentUser(request('/api/me', undefined, cookie))
    ).rejects.toMatchObject({ status: 401 });
    expect(
      await verifySecondFactor(
        request('/api/auth/verify-2fa', { totpCode: '000000' }, cookie)
      )
    ).toEqual({ status: 'INVALID_TOTP_CODE' });

    const verified = request(
      '/api/auth/verify-2fa',
      { totpCode: '123456' },
      cookie
    );
    expect(await verifySecondFactor(verified)).toEqual({ status: 'success' });
    const { sessionTimeout } = await fixture.store.general.getSessionConfig();
    expect(verified.res.headers.get('set-cookie')).toContain(
      `Max-Age=${sessionTimeout}`
    );
    const authenticatedCookie = sessionCookie(verified);
    expect(
      await sessionUser(request('/api/session', undefined, authenticatedCookie))
    ).toMatchObject({ id: 1, totpVerified: true });
    await expect(
      pendingLogin(request('/api/auth/pending', undefined, authenticatedCookie))
    ).rejects.toMatchObject({ status: 401 });
  });

  test('a cancelled second-factor challenge cannot authenticate', async () => {
    await fixture.store.users.update(1, {
      totpVerified: true,
      totpKey: 'secret',
    });
    const login = request('/api/auth/password', credentials);
    await passwordLogin(login);
    const cancelled = request('/api/auth/cancel', {}, sessionCookie(login));
    await cancelLogin(cancelled);
    const cookie = sessionCookie(cancelled);
    await expect(
      pendingLogin(request('/api/auth/pending', undefined, cookie))
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      verifySecondFactor(
        request('/api/auth/verify-2fa', { totpCode: '123456' }, cookie)
      )
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      getCurrentUser(request('/api/me', undefined, cookie))
    ).rejects.toMatchObject({ status: 401 });
  });

  test('clears an expired challenge without granting a session', async () => {
    await fixture.store.users.update(1, {
      totpVerified: true,
      totpKey: 'secret',
    });
    const login = request('/api/auth/password', credentials);
    await passwordLogin(login);
    now += 300001;
    const expired = request(
      '/api/auth/verify-2fa',
      { totpCode: '123456' },
      sessionCookie(login)
    );
    expect(await verifySecondFactor(expired)).toEqual({
      status: 'PENDING_LOGIN_EXPIRED',
    });
    await expect(
      getCurrentUser(request('/api/me', undefined, sessionCookie(expired)))
    ).rejects.toMatchObject({ status: 401 });
  });

  test('maps disabled-account errors and rejects stale sessions', async () => {
    const login = request('/api/auth/password', credentials);
    await passwordLogin(login);
    const cookie = sessionCookie(login);
    await fixture.store.users.update(1, { enabled: false });
    await expect(
      sessionUser(request('/api/session', undefined, cookie))
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      getCurrentUser(request('/api/me', undefined, cookie))
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      passwordLogin(request('/api/auth/password', credentials))
    ).rejects.toMatchObject({ status: 401 });
  });

  test('validates requests before authenticating and maps bad credentials to 401', async () => {
    await expect(
      passwordLogin(request('/api/auth/password', {}))
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      passwordLogin(
        request('/api/auth/password', {
          ...credentials,
          password: 'another-long-password',
        })
      )
    ).rejects.toMatchObject({ status: 401 });
  });
});

function oauthRequest(path: string, cookie = '') {
  const event = request(`/api/auth/oidc${path}`, undefined, cookie);
  event.context.params = { provider: 'oidc' };
  return event;
}

describe('OAuth workflow', () => {
  test('exchanges verified claims and replaces transient state with an authenticated session', async () => {
    await fixture.store.users.update(1, { email: 'admin@example.com' });
    const start = oauthRequest('');
    await beginOAuth(start);
    const redirect = new URL(start.res.headers.get('location')!);
    expect(redirect.searchParams.get('redirect_uri')).toBe(
      'https://localhost/api/auth/oidc/callback'
    );
    expect(redirect.searchParams.get('code_challenge')).toBe('challenge');

    const callback = oauthRequest(
      '/callback?code=code&state=state',
      sessionCookie(start)
    );
    await oauthCallback(callback);
    expect(oauthClient.authorizationCodeGrant).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(URL),
      {
        pkceCodeVerifier: 'verifier',
        expectedNonce: 'nonce',
        expectedState: 'state',
        idTokenExpected: true,
      }
    );
    expect(callback.res.headers.get('location')).toBe('/');
    const cookie = sessionCookie(callback);
    await expect(
      oauthCallback(oauthRequest('/callback?code=code&state=state', cookie))
    ).rejects.toMatchObject({ status: 400 });
    expect(oauthClient.authorizationCodeGrant).toHaveBeenCalledOnce();
    expect(
      await getCurrentUser(request('/api/me', undefined, cookie))
    ).toMatchObject({ id: 1 });
  });

  test('consumes OAuth state after linking an authenticated account', async () => {
    const login = request('/api/auth/password', credentials);
    await passwordLogin(login);
    const start = oauthRequest('?link=true', sessionCookie(login));
    await beginOAuth(start);
    expect(
      new URL(start.res.headers.get('location')!).searchParams.get(
        'redirect_uri'
      )
    ).toBe('https://localhost/api/auth/oidc/link');
    const callback = oauthRequest(
      '/link?code=code&state=state',
      sessionCookie(start)
    );
    await oauthLink(callback);
    expect(callback.res.headers.get('location')).toBe('/me');
    expect(await fixture.store.users.get(1)).toMatchObject({
      oauthProvider: 'oidc',
      oauthId: 'external-user',
    });
    await expect(
      oauthLink(
        oauthRequest('/link?code=code&state=state', sessionCookie(callback))
      )
    ).rejects.toMatchObject({ status: 400 });
    expect(oauthClient.authorizationCodeGrant).toHaveBeenCalledOnce();
  });

  test('hands OAuth authentication to TOTP without granting a session early', async () => {
    await fixture.store.users.update(1, {
      email: 'admin@example.com',
      totpVerified: true,
      totpKey: 'secret',
    });
    const start = oauthRequest('');
    await beginOAuth(start);
    const callback = oauthRequest(
      '/callback?code=code&state=state',
      sessionCookie(start)
    );
    await oauthCallback(callback);
    expect(callback.res.headers.get('location')).toBe('/login/2fa');
    const cookie = sessionCookie(callback);
    expect(
      await pendingLogin(request('/api/auth/pending', undefined, cookie))
    ).toEqual({ type: 'oauth' });
    await expect(
      getCurrentUser(request('/api/me', undefined, cookie))
    ).rejects.toMatchObject({ status: 401 });
    const secondFactor = request(
      '/api/auth/verify-2fa',
      { totpCode: '123456' },
      cookie
    );
    expect(await verifySecondFactor(secondFactor)).toEqual({
      status: 'success',
    });
    expect(secondFactor.res.headers.get('set-cookie')).not.toContain(
      'Max-Age='
    );
    expect(
      await getCurrentUser(
        request('/api/me', undefined, sessionCookie(secondFactor))
      )
    ).toMatchObject({ id: 1 });
  });

  test.each(['exchange', 'claims'])(
    'clears OAuth state when %s is rejected',
    async (failure) => {
      const start = oauthRequest('');
      await beginOAuth(start);
      if (failure === 'exchange')
        vi.mocked(oauthClient.authorizationCodeGrant).mockRejectedValueOnce(
          new Error('Invalid state')
        );
      else
        vi.mocked(oauthClient.fetchUserInfo).mockResolvedValueOnce({
          sub: 'external-user',
          email: 'admin@example.com',
          email_verified: false,
        });
      const callback = oauthRequest(
        '/callback?code=code&state=state',
        sessionCookie(start)
      );
      await expect(oauthCallback(callback)).rejects.toThrow(
        failure === 'exchange' ? 'Invalid state' : 'Email is not verified'
      );
      const cookie = sessionCookie(callback);
      await expect(
        oauthCallback(oauthRequest('/callback?code=code&state=state', cookie))
      ).rejects.toMatchObject({ status: 400 });
      expect(oauthClient.authorizationCodeGrant).toHaveBeenCalledOnce();
      expect(await fixture.store.users.count()).toBe(1);
      await expect(
        getCurrentUser(request('/api/me', undefined, cookie))
      ).rejects.toMatchObject({ status: 401 });
    }
  );

  test('rejects callbacks without state before exchanging a code', async () => {
    await expect(
      oauthCallback(oauthRequest('/callback?code=code'))
    ).rejects.toMatchObject({ status: 400 });
    expect(oauthClient.authorizationCodeGrant).not.toHaveBeenCalled();
  });
});
