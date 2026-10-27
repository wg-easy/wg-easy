import { createError, getHeader, getSession, isError, useSession } from 'h3';
import * as oauthClient from 'openid-client';
import type { H3Event } from 'h3';

import { buildOauthConfig, getUserInfo } from './oauth';

import * as identity from '#server/features/identity';
import { getDatabase } from '#db';
import { WG_ENV, SERVER_DEBUG } from '#server/utils/config';
import { logSecurityEvent } from '#server/utils/securityLogger';
import { getTrustedRequestHost } from '#server/utils/trustedProxy';
import type {
  Actor,
  PendingLogin,
  PublicUser,
} from '#shared/contracts/identity';

export type WGSession = Partial<{
  userId: number;
  pendingLogin: PendingLogin;
  oauth_verifier: string;
  oauth_nonce: string;
  oauth_state: string;
}>;

const name = 'wg-easy';

const clearTransientState = {
  pendingLogin: undefined,
  oauth_nonce: undefined,
  oauth_state: undefined,
  oauth_verifier: undefined,
};

async function authenticate(
  event: H3Event,
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
      statusCode: result.error === 'UNEXPECTED_ERROR' ? 500 : 401,
      statusMessage: messages[result.error],
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
  event: H3Event,
  credentials: { username: string; password: string; remember?: boolean }
) {
  const { username, password, remember } = credentials;
  const result = await identity.login(username, password, remember);
  if (!result.success && result.error === 'INCORRECT_CREDENTIALS')
    logSecurityEvent(event, 'password', username);
  return authenticate(event, result, remember);
}

export async function completeSecondFactor(event: H3Event, code: string) {
  const { data } = await getWGSession(event);
  const pendingLogin = data.pendingLogin;
  const result = await identity.completeSecondFactor(pendingLogin, code);
  if (result.status === 'INVALID_TOTP_CODE') {
    logSecurityEvent(event, '2fa');
    return { status: result.status };
  }
  if (result.status === 'USER_DISABLED')
    throw createError({ statusCode: 401, statusMessage: 'User disabled' });
  const session = await useWGSession(event, pendingLogin?.remember);
  await session.update({
    ...clearTransientState,
    userId: result.status === 'success' ? result.userId : undefined,
  });
  return { status: result.status };
}

export async function pendingLogin(event: H3Event) {
  const session = await useWGSession(event);
  const pending = identity.pending(session.data.pendingLogin);
  if (!pending) {
    await session.update(clearTransientState);
    throw createError({
      statusCode: 401,
      statusMessage: 'No pending authentication',
    });
  }
  return { type: pending.type };
}

export async function cancelLogin(event: H3Event) {
  const session = await useWGSession(event);
  await session.update(clearTransientState);
  return { success: true as const };
}

export async function beginOAuth(event: H3Event, link = false) {
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

export async function completeOAuth(event: H3Event, actor?: Actor) {
  const { config, provider, providerConfig } = await buildOauthConfig(event);
  const session = await useWGSession(event);
  const { oauth_nonce, oauth_verifier, oauth_state } = session.data;
  if (!oauth_nonce || !oauth_verifier || !oauth_state)
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing OAuth State',
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

export async function currentSessionUser(event: H3Event) {
  const session = await getWGSession(event);
  if (!session.data.userId || session.data.pendingLogin)
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' });
  const user = await identity.sessionUser(session.data.userId);
  if (!user)
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found in Database',
    });
  return user;
}

export async function logout(event: H3Event) {
  const session = await useWGSession(event);
  const sessionId = session.id;
  if (sessionId === undefined)
    throw createError({ statusCode: 401, statusMessage: 'Not logged in' });
  await session.clear();
  SERVER_DEBUG(`Deleted Session: ${sessionId}`);
  return { success: true };
}

async function useWGSession(event: H3Event, rememberMe = false) {
  const sessionConfig = await getDatabase().general.getSessionConfig();
  return useSession<WGSession>(event, {
    password: sessionConfig.sessionPassword,
    name,
    // TODO: add session expiration
    // maxAge: undefined
    cookie: {
      maxAge: rememberMe ? sessionConfig.sessionTimeout : undefined,
      secure: !WG_ENV.INSECURE,
    },
  });
}

export async function getWGSession(event: H3Event) {
  const sessionConfig = await getDatabase().general.getSessionConfig();
  return getSession<WGSession>(event, {
    password: sessionConfig.sessionPassword,
    name,
    cookie: {
      secure: !WG_ENV.INSECURE,
    },
  });
}

/**
 * @throws
 */
export async function getCurrentUser(event: H3Event) {
  const session = await getWGSession(event);
  const authorization = getHeader(event, 'Authorization');
  let user: PublicUser | undefined;
  if (session.data.pendingLogin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication pending',
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
        statusCode: 400,
        statusMessage: 'Invalid Basic Authorization',
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
        statusCode: 400,
        statusMessage: 'Invalid Basic Authorization',
      });
    }

    try {
      user = await identity.authenticateBasic(username, password);
    } catch (error) {
      if (isError(error) && [401, 403].includes(error.statusCode))
        logSecurityEvent(event, 'basic', username);
      throw error;
    }
  } else {
    throw createError({
      statusCode: 401,
      statusMessage: 'Session failed. No Authorization',
    });
  }
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Session failed. User not found',
    });
  }
  return user;
}
