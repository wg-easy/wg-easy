import { getRouterParam, createError } from 'nuxt/server';
import type { RequestEvent } from 'nuxt/server';
import { $fetch } from 'ofetch';
import * as client from 'openid-client';

import {
  WG_ENV,
  OAUTH_PROVIDERS,
  isValidOauthProvider,
  type OAuthConfig,
} from '#server/utils/config';
import { getTrustedRequestURL } from '#server/http/request';

export async function buildOauthConfig(event: RequestEvent) {
  const provider = getRouterParam(event, 'provider', { decode: true });
  if (!provider || !isValidOauthProvider(provider)) {
    throw createError({
      status: 400,
      statusText: 'Invalid provider',
    });
  }

  const oauthProvider = OAUTH_PROVIDERS[provider];
  if (
    !WG_ENV.OAUTH_PROVIDERS?.includes(provider) ||
    !oauthProvider.clientId ||
    !oauthProvider.clientSecret
  ) {
    throw createError({
      status: 403,
      statusText: 'Provider is not enabled',
    });
  }

  const config = await client.discovery(
    new URL(oauthProvider.server),
    oauthProvider.clientId,
    {
      client_secret: oauthProvider.clientSecret,
    }
  );

  return { config, providerConfig: oauthProvider, provider };
}

async function githubUserInfoFlow(accessToken: string) {
  const OAUTH_GITHUB_FLOW = {
    userinfo_endpoint: 'https://api.github.com/user',
    email_endpoint: 'https://api.github.com/user/emails',
  };
  type OAUTH_GITHUB_USERINFO = {
    id: number;
    login: string;
    avatar_url: string;
    email: string | null;
    name: string | null;
  };
  type OAUTH_GITHUB_EMAIL = {
    email: string;
    primary: boolean;
    verified: boolean;
    visibility: string | null;
  }[];

  const response = await $fetch<OAUTH_GITHUB_USERINFO>(
    OAUTH_GITHUB_FLOW.userinfo_endpoint,
    {
      headers: {
        'User-Agent': 'wg-easy',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!response.email) {
    const emailResponse = await $fetch<OAUTH_GITHUB_EMAIL>(
      OAUTH_GITHUB_FLOW.email_endpoint,
      {
        headers: {
          'User-Agent': 'wg-easy',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const primaryEmail = emailResponse.find((v) => v.primary && v.verified);
    response.email = primaryEmail?.email || null;
  }
  return {
    sub: response.id.toString(),
    email: response.email ?? undefined,
    email_verified: true,
    preferred_username: response.login,
    name: response.name || response.login,
  };
}

type OauthState = {
  oauth_nonce: string;
  oauth_verifier: string;
  oauth_state: string;
};

export async function getUserInfo(
  event: RequestEvent,
  config: client.Configuration,
  state: OauthState,
  providerConfig: OAuthConfig
) {
  const currentUrl = getTrustedRequestURL(event, WG_ENV.TRUSTED_PROXIES);
  currentUrl.protocol = WG_ENV.INSECURE ? 'http' : 'https';

  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: state.oauth_verifier,
    expectedNonce:
      providerConfig.isOIDC === false ? undefined : state.oauth_nonce,
    expectedState: state.oauth_state,
    idTokenExpected: providerConfig.isOIDC ?? true,
  });

  type SubjectType = string | undefined | typeof client.skipSubjectCheck;
  let subject: SubjectType = tokens.claims()?.sub;
  if (providerConfig.isOIDC === false) {
    subject = client.skipSubjectCheck;
  }

  if (!subject) {
    throw createError({
      status: 400,
      statusText: "Can't get subject",
    });
  }

  let userInfo: client.UserInfoResponse;
  if (providerConfig.userInfoFlow === 'github') {
    userInfo = await githubUserInfoFlow(tokens.access_token);
  } else {
    userInfo = await client.fetchUserInfo(config, tokens.access_token, subject);
  }

  assertHasOauthProps(userInfo);

  if (!isAllowedDomain(userInfo.email)) {
    throw createError({
      status: 401,
      statusText: 'Email domain not allowed',
    });
  }

  return userInfo;
}

type RequireKeys<T extends object, K extends keyof T> = Required<Pick<T, K>>;

function assertHasOauthProps<T extends client.UserInfoResponse>(
  userInfo: T
): asserts userInfo is T & RequireKeys<T, 'sub' | 'email' | 'email_verified'> {
  if (!userInfo.sub) {
    throw createError({
      status: 400,
      statusText: 'No sub set',
    });
  }

  if (!userInfo.email) {
    throw createError({
      status: 400,
      statusText: 'No email set',
    });
  }

  if (!userInfo.email_verified) {
    throw createError({
      status: 401,
      statusText: 'Email is not verified',
    });
  }
}

function isAllowedDomain(email: string) {
  const emailDomain = email.slice(email.lastIndexOf('@') + 1);
  if (
    WG_ENV.OAUTH_ALLOWED_DOMAINS &&
    !WG_ENV.OAUTH_ALLOWED_DOMAINS.includes(emailDomain)
  ) {
    return false;
  }
  return true;
}
