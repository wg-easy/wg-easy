import { getResponseHeader, mockEvent, type H3Event } from 'h3';
import { beforeEach, onTestFinished, describe, expect, test, vi } from 'vitest';
import * as oauthClient from 'openid-client';

import { databaseFixture } from '../helpers/database';
import { resetCryptoMocks } from '../helpers/crypto';

import {
  getCurrentUser,
  getWGSession,
} from '#server/features/identity/session';
import passwordLogin from '#server/api/auth/password.post';
import verifySecondFactor from '#server/api/auth/verify-2fa.post';
import sessionUser from '#server/api/session.get';
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
vi.mock('@intlify/h3', () => ({ useTranslation: () => (key: string) => key }));

let fixture: Awaited<ReturnType<typeof databaseFixture>>;
let now: number;

function request(path: string, body?: unknown, cookie = '') {
  return mockEvent(`https://localhost${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', host: 'localhost', cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function sessionCookie(event: H3Event) {
  const header = getResponseHeader(event, 'set-cookie');
  const cookies = Array.isArray(header) ? header : [String(header)];
  const session = cookies.find((cookie) => cookie.startsWith('wg-easy='));
  expect(session).toBeDefined();
  expect(session).toContain('HttpOnly');
  expect(session).toContain('Secure');
  return session!.split(';')[0]!;
}

const credentials = {
  username: 'admin',
  password: 'a-long-password',
  remember: true,
};

beforeEach(async () => {
  vi.resetAllMocks();
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
    return mockEvent('https://localhost/api/admin/general', {
      headers: {
        authorization: `Basic ${Buffer.from(`${credentials.username}:${password}`).toString('base64')}`,
      },
    });
  }

  test('logs rejected Basic credentials', async () => {
    const event = basicRequest('wrong');
    await expect(getCurrentUser(event)).rejects.toMatchObject({
      statusCode: 401,
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
      statusCode: 403,
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
      statusCode: 401,
    });
    await fixture.store.users.update(1, { role: roles.CLIENT });
    const login = request('/api/auth/password', credentials);
    await passwordLogin(login);
    await expect(
      handler(request(`/api/admin/${path}`, undefined, sessionCookie(login)))
    ).rejects.toMatchObject({ statusCode: 403 });
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
    'keeps TOTP unauthenticated and preserves remember=%s on completion',
    async (remember) => {
      const previous = request('/api/auth/password', credentials);
      await passwordLogin(previous);
      await fixture.store.users.update(1, {
        totpVerified: true,
        totpKey: 'secret',
      });
      const login = request(
        '/api/auth/password',
        { ...credentials, remember },
        sessionCookie(previous)
      );
      expect(await passwordLogin(login)).toEqual({ status: 'TOTP_REQUIRED' });
      const cookie = sessionCookie(login);
      const pending = await getWGSession(
        request('/api/session', undefined, cookie)
      );
      expect(pending.data).toEqual({
        pendingLogin: {
          type: 'password',
          userId: 1,
          remember,
          expires_at: now + 300000,
        },
      });
      await expect(
        sessionUser(request('/api/session', undefined, cookie))
      ).rejects.toMatchObject({ statusCode: 401 });
      await expect(
        getCurrentUser(request('/api/me', undefined, cookie))
      ).rejects.toMatchObject({ statusCode: 401 });
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
      const cookieHeader = String(getResponseHeader(verified, 'set-cookie'));
      if (remember) {
        const { sessionTimeout } =
          await fixture.store.general.getSessionConfig();
        expect(cookieHeader).toContain(`Max-Age=${sessionTimeout}`);
      } else {
        expect(cookieHeader).not.toContain('Max-Age=');
      }
      const authenticatedCookie = sessionCookie(verified);
      const authenticated = await getWGSession(
        request('/api/session', undefined, authenticatedCookie)
      );
      expect(authenticated.data).toEqual({ userId: 1 });
      expect(
        await sessionUser(
          request('/api/session', undefined, authenticatedCookie)
        )
      ).toMatchObject({ id: 1, totpVerified: true });
    }
  );

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
    const session = await getWGSession(
      request('/api/session', undefined, sessionCookie(expired))
    );
    expect(session.data).toEqual({});
  });

  test('maps disabled-account errors and rejects stale sessions', async () => {
    const login = request('/api/auth/password', credentials);
    await passwordLogin(login);
    const cookie = sessionCookie(login);
    await fixture.store.users.update(1, { enabled: false });
    await expect(
      sessionUser(request('/api/session', undefined, cookie))
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      getCurrentUser(request('/api/me', undefined, cookie))
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      passwordLogin(request('/api/auth/password', credentials))
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test('validates requests before authenticating and maps bad credentials to 401', async () => {
    await expect(
      passwordLogin(request('/api/auth/password', {}))
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      passwordLogin(
        request('/api/auth/password', {
          ...credentials,
          password: 'another-long-password',
        })
      )
    ).rejects.toMatchObject({ statusCode: 401 });
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
    const redirectResponse = await beginOAuth(start);
    const redirect = new URL(redirectResponse.headers.get('location')!);
    expect(redirect.searchParams.get('redirect_uri')).toBe(
      'https://localhost/api/auth/oidc/callback'
    );
    expect(redirect.searchParams.get('code_challenge')).toBe('challenge');

    const callback = oauthRequest(
      '/callback?code=code&state=state',
      sessionCookie(start)
    );
    const response = await oauthCallback(callback);
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
    expect(response.headers.get('location')).toBe('/');
    const cookie = sessionCookie(callback);
    expect(
      (await getWGSession(request('/api/session', undefined, cookie))).data
    ).toEqual({ userId: 1 });
    expect(
      await getCurrentUser(request('/api/me', undefined, cookie))
    ).toMatchObject({ id: 1 });
  });

  test('consumes OAuth state after linking an authenticated account', async () => {
    const login = request('/api/auth/password', credentials);
    await passwordLogin(login);
    const start = oauthRequest('?link=true', sessionCookie(login));
    const redirectResponse = await beginOAuth(start);
    expect(
      new URL(redirectResponse.headers.get('location')!).searchParams.get(
        'redirect_uri'
      )
    ).toBe('https://localhost/api/auth/oidc/link');
    const callback = oauthRequest(
      '/link?code=code&state=state',
      sessionCookie(start)
    );
    const response = await oauthLink(callback);
    expect(response.headers.get('location')).toBe('/me');
    expect(await fixture.store.users.get(1)).toMatchObject({
      oauthProvider: 'oidc',
      oauthId: 'external-user',
    });
    expect(
      (
        await getWGSession(
          request('/api/session', undefined, sessionCookie(callback))
        )
      ).data
    ).toEqual({ userId: 1 });
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
    const response = await oauthCallback(callback);
    expect(response.headers.get('location')).toBe('/login/2fa');
    const cookie = sessionCookie(callback);
    expect(
      (await getWGSession(request('/api/session', undefined, cookie))).data
    ).toEqual({
      pendingLogin: {
        type: 'oauth',
        userId: 1,
        remember: false,
        expires_at: now + 300000,
      },
    });
    await expect(
      getCurrentUser(request('/api/me', undefined, cookie))
    ).rejects.toMatchObject({ statusCode: 401 });
    const secondFactor = request(
      '/api/auth/verify-2fa',
      { totpCode: '123456' },
      cookie
    );
    expect(await verifySecondFactor(secondFactor)).toEqual({
      status: 'success',
    });
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
      expect(
        (await getWGSession(request('/api/session', undefined, cookie))).data
      ).toEqual({});
      expect(await fixture.store.users.count()).toBe(1);
      await expect(
        getCurrentUser(request('/api/me', undefined, cookie))
      ).rejects.toMatchObject({ statusCode: 401 });
    }
  );

  test('rejects callbacks without state before exchanging a code', async () => {
    await expect(
      oauthCallback(oauthRequest('/callback?code=code'))
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(oauthClient.authorizationCodeGrant).not.toHaveBeenCalled();
  });
});
