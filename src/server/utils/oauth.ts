import type { H3Event } from 'h3';
import { discovery } from 'openid-client';

export const OAUTH_PROVIDERS = {
  google: {
    server: 'https://accounts.google.com',
    scope: 'openid email profile',
    clientId: process.env.OAUTH_GOOGLE_CLIENT_ID,
    clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
    params: {
      access_type: 'online',
      prompt: 'select_account',
    },
  },
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

export async function buildOauthConfig(event: H3Event) {
  const provider = getRouterParam(event, 'provider');
  if (!provider || !isValidOauthProvider(provider)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid provider',
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
