import type { H3Event } from 'h3';
import { discovery } from 'openid-client';

type OAuthConfig = {
  friendlyName: string;
  server: string;
  scope: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
  params: Record<string, string>;
  isOIDC?: false;
  userInfoFlow?: 'github';
};

const GoogleConfig: OAuthConfig = {
  friendlyName: 'Google',
  server: 'https://accounts.google.com',
  scope: 'openid email profile',
  clientId: process.env.OAUTH_GOOGLE_CLIENT_ID,
  clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
  params: {
    access_type: 'online',
    prompt: 'select_account',
  },
};
const GithubConfig: OAuthConfig = {
  friendlyName: 'GitHub',
  server: 'https://github.com/login/oauth',
  scope: 'read:user user:email',
  clientId: process.env.OAUTH_GITHUB_CLIENT_ID,
  clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
  params: {
    allow_signup: 'false',
    prompt: 'select_account',
  },
  isOIDC: false,
  userInfoFlow: 'github',
};
const OidcConfig: OAuthConfig = {
  friendlyName: process.env.OAUTH_OIDC_NAME ?? 'OIDC',
  server: process.env.OAUTH_OIDC_SERVER ?? '',
  scope: 'openid email profile',
  clientId: process.env.OAUTH_OIDC_CLIENT_ID,
  clientSecret: process.env.OAUTH_OIDC_CLIENT_SECRET,
  params: {},
};

export const OAUTH_PROVIDERS = {
  google: GoogleConfig,
  github: GithubConfig,
  oidc: OidcConfig,
};

export type OAUTH_PROVIDER = keyof typeof OAUTH_PROVIDERS;

export function isValidOauthProvider(
  provider: string
): provider is OAUTH_PROVIDER {
  if (provider in OAUTH_PROVIDERS) {
    return true;
  }
  return false;
}

export function isConfiguredOauthProvider(
  oauthProvider: (typeof OAUTH_PROVIDERS)[OAUTH_PROVIDER]
): oauthProvider is (typeof OAUTH_PROVIDERS)[OAUTH_PROVIDER] & {
  clientId: string;
  clientSecret: string;
} {
  if (!oauthProvider.clientId || !oauthProvider.clientSecret) {
    return false;
  }
  return true;
}

function isEnabledProvider(provider: OAUTH_PROVIDER) {
  return WG_ENV.OAUTH_PROVIDERS?.includes(provider);
}

// TODO: simplify logic between WG_ENV.OAUTH_PROVIDERS and buildOauthConfig
export async function buildOauthConfig(event: H3Event) {
  const provider = getRouterParam(event, 'provider');
  if (!provider || !isValidOauthProvider(provider)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid provider',
    });
  }

  if (!isEnabledProvider(provider)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Disabled provider',
    });
  }

  const oauthProvider = OAUTH_PROVIDERS[provider];

  if (!isConfiguredOauthProvider(oauthProvider)) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Provider is not configured',
    });
  }

  const config = await discovery(
    new URL(oauthProvider.server),
    oauthProvider.clientId,
    {
      client_secret: oauthProvider.clientSecret,
    }
  );

  return { config, providerConfig: oauthProvider, provider };
}

export async function githubUserInfoFlow(accessToken: string) {
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
    email: response.email,
    email_verified: true,
    preferred_username: response.login,
    name: response.name || response.login,
  };
}
