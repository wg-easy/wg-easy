import { createError, getSession, isNuxtError, useSession } from 'nuxt/server';
import * as oauthClient from 'openid-client';
import type { RequestEvent } from 'nuxt/server';

import { buildOauthConfig, getUserInfo } from './oauth';

import * as identity from '#server/features/identity';
import { getDatabase } from '#db';
import { WG_ENV, SERVER_DEBUG } from '#server/utils/config';
import { logSecurityEvent } from '#server/utils/securityLogger';
import { getTrustedRequestHost } from '#server/http/request';
import type {
  Actor,
  PendingLogin,
  PublicUser,
} from '#shared/contracts/identity';

type WGSession = Partial<{
  userId: number;
  pendingLogin: PendingLogin;
  oauth_verifier: string;
  oauth_nonce: string;
  oauth_state: string;
}>;

const clearTransientState = {
  pendingLogin: undefined,
  oauth_nonce: undefined,
  oauth_state: undefined,
  oauth_verifier: undefined,
};

async function authenticate(
  event: RequestEvent,
  result: Awaited<
    ReturnType<typeof identity.login | typeof identity.loginWithOAuth>
  >,
  remember = false
) {
  if (!result.success && result.error !== 'TOTP_REQUIRED') {
    const messages = {
      INCORRECT_CREDENTIALS: 'Invalid username or password',
      USER_DISABLED: 'User disabled',
      USER_ALREADY_LINKED:
        'User already linked with different account or provider',
      AUTO_REGISTER_DISABLED: 'Auto registration is disabled',
      UNEXPECTED_ERROR: 'Unexpected error',
    };
    throw createError({
      status: result.error === 'UNEXPECTED_ERROR' ? 500 : 401,
      statusText: messages[result.error],
    });
  }
  const session = await useWGSession(event, remember);
  if (!result.success) {
    await session.update({
      ...clearTransientState,
      userId: undefined,
      pendingLogin: result.pendingLogin,
    });
    return { status: 'TOTP_REQUIRED' as const };
  }
  await session.update({ ...clearTransientState, userId: result.user.id });
  SERVER_DEBUG(
    `New Session: ${session.id} for ${result.user.id} (${result.user.username})`
  );
  return { status: 'success' as const };
}

export async function login(
  event: RequestEvent,
  credentials: { username: string; password: string; remember?: boolean }
) {
  const { username, password, remember } = credentials;
  const result = await identity.login(username, password, remember);
  if (!result.success && result.error === 'INCORRECT_CREDENTIALS')
    logSecurityEvent(event, 'password', username);
  return authenticate(event, result, remember);
}

export async function completeSecondFactor(event: RequestEvent, code: string) {
  const { data } = await getWGSession(event);
  const pendingLogin = data.pendingLogin;
  const result = await identity.completeSecondFactor(pendingLogin, code);
  if (result.status === 'INVALID_TOTP_CODE') {
    logSecurityEvent(event, '2fa');
    return { status: result.status };
  }
  if (result.status === 'USER_DISABLED')
    throw createError({ status: 401, statusText: 'User disabled' });
  const session = await useWGSession(event, pendingLogin?.remember);
  await session.update({
    ...clearTransientState,
    userId: result.status === 'success' ? result.userId : undefined,
  });
  return { status: result.status };
}

export async function pendingLogin(event: RequestEvent) {
  const session = await useWGSession(event);
  const pending = identity.pending(session.data.pendingLogin);
  if (!pending) {
    await session.update(clearTransientState);
    throw createError({
      status: 401,
      statusText: 'No pending authentication',
    });
  }
  return { type: pending.type };
}

export async function cancelLogin(event: RequestEvent) {
  const session = await useWGSession(event);
  await session.update(clearTransientState);
  return { success: true as const };
}

export async function beginOAuth(event: RequestEvent, link = false) {
  if (link) await getCurrentUser(event);
  const { config, provider, providerConfig } = await buildOauthConfig(event);
  const host = getTrustedRequestHost(event, WG_ENV.TRUSTED_PROXIES);
  const protocol = WG_ENV.INSECURE ? 'http' : 'https';
  const verifier = oauthClient.randomPKCECodeVerifier();
  const challenge = await oauthClient.calculatePKCECodeChallenge(verifier);
  const nonce = oauthClient.randomNonce();
  const state = oauthClient.randomState();
  const session = await useWGSession(event);
  await session.update({
    ...clearTransientState,
    oauth_nonce: nonce,
    oauth_verifier: verifier,
    oauth_state: state,
  });
  return oauthClient
    .buildAuthorizationUrl(config, {
      ...providerConfig.params,
      redirect_uri: `${protocol}://${host}/api/auth/${provider}/${link ? 'link' : 'callback'}`,
      scope: providerConfig.scope,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      nonce,
      state,
    })
    .toString();
}

export async function completeOAuth(event: RequestEvent, actor?: Actor) {
  const { config, provider, providerConfig } = await buildOauthConfig(event);
  const session = await useWGSession(event);
  const { oauth_nonce, oauth_verifier, oauth_state } = session.data;
  if (!oauth_nonce || !oauth_verifier || !oauth_state)
    throw createError({
      status: 400,
      statusText: 'Missing OAuth State',
    });
  // Consume transient state on both successful and rejected exchanges.
  await session.update(clearTransientState);
  const info = await getUserInfo(
    event,
    config,
    { oauth_nonce, oauth_verifier, oauth_state },
    providerConfig
  );
  if (actor) {
    await identity.linkOauth(actor, provider, info.sub);
    return '/me';
  }
  const result = await identity.loginWithOAuth(
    provider,
    info.sub,
    info.preferred_username || info.email,
    info.email,
    info.name || 'User'
  );
  const login = await authenticate(event, result);
  return login.status === 'TOTP_REQUIRED' ? '/login/2fa' : '/';
}

export async function currentSessionUser(event: RequestEvent) {
  const session = await getWGSession(event);
  if (!session.data.userId || session.data.pendingLogin)
    throw createError({ status: 401, statusText: 'Not authenticated' });
  const user = await identity.sessionUser(session.data.userId);
  if (!user)
    throw createError({
      status: 404,
      statusText: 'Not found in Database',
    });
  return user;
}

export async function logout(event: RequestEvent) {
  const session = await useWGSession(event);
  const sessionId = session.id;
  await session.clear();
  SERVER_DEBUG(`Deleted Session: ${sessionId}`);
  return { success: true };
}

async function sessionConfig(rememberMe = false) {
  const { sessionPassword, sessionTimeout } =
    await getDatabase().general.getSessionConfig();
  const maxAge = rememberMe ? sessionTimeout : undefined;
  return {
    password: sessionPassword,
    name: 'wg-easy',
    // Expire both the remembered cookie and its sealed contents.
    maxAge,
    cookie: {
      // Preserve Max-Age=0 too; Nuxt only applies a truthy top-level maxAge.
      maxAge,
      secure: !WG_ENV.INSECURE,
    },
  };
}

async function useWGSession(event: RequestEvent, rememberMe = false) {
  return useSession<WGSession>(event, await sessionConfig(rememberMe));
}

async function getWGSession(event: RequestEvent) {
  return getSession<WGSession>(event, await sessionConfig());
}

export async function getCurrentUser(event: RequestEvent) {
  const session = await getWGSession(event);
  const authorization = event.req.headers.get('Authorization');
  let user: PublicUser | undefined;
  if (session.data.pendingLogin) {
    throw createError({
      status: 401,
      statusText: 'Authentication pending',
    });
  }
  if (session.data.userId) {
    // Handle if authenticating using Session
    user = await identity.sessionUser(session.data.userId);
  } else if (authorization) {
    identity.assertPasswordEnabled();

    // Handle if authenticating using Header
    const [method, value] = authorization.split(' ');
    // Support Basic Authentication
    // TODO: support personal access token or similar
    if (method !== 'Basic' || !value) {
      logSecurityEvent(event, 'basic');
      throw createError({
        status: 400,
        statusText: 'Invalid Basic Authorization',
      });
    }

    const basicValue = Buffer.from(value, 'base64').toString('utf-8');

    // Split by first ":"
    const index = basicValue.indexOf(':');
    const username = basicValue.substring(0, index);
    const password = basicValue.substring(index + 1);

    if (!username || !password) {
      logSecurityEvent(event, 'basic', username);
      throw createError({
        status: 400,
        statusText: 'Invalid Basic Authorization',
      });
    }

    try {
      user = await identity.authenticateBasic(username, password);
    } catch (error) {
      if (isNuxtError(error) && [401, 403].includes(error.status))
        logSecurityEvent(event, 'basic', username);
      throw error;
    }
  } else {
    throw createError({
      status: 401,
      statusText: 'Session failed. No Authorization',
    });
  }
  if (!user) {
    throw createError({
      status: 401,
      statusText: 'Session failed. User not found',
    });
  }
  return user;
}
