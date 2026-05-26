import type { H3Event } from 'h3';
import { discovery } from 'openid-client';

const OAUTH_PROVIDERS = {
  google: {
    server: 'https://accounts.google.com',
    scope: 'openid email',
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

export async function buildOauthConfig(event: H3Event) {
  const provider = getRouterParam(event, 'provider');
  if (!provider || !isValidOauthProvider(provider)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid provider',
    });
  }

  const oauthProvider = OAUTH_PROVIDERS[provider];
  const config = await discovery(
    new URL(oauthProvider.server),
    OAUTH_GOOGLE_ENV.CLIENT_ID,
    {
      client_secret: OAUTH_GOOGLE_ENV.CLIENT_SECRET,
    }
  );

  return { config, providerConfig: oauthProvider, provider };
}
