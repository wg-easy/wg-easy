import { defineEventHandler } from 'nuxt/server';

import { WG_ENV, OAUTH_PROVIDERS } from '#server/utils/config';
import type { OAuthProvider } from '#shared/contracts/identity';

export default defineEventHandler(() => {
  return {
    providers: WG_ENV.OAUTH_PROVIDERS?.reduce(
      (acc, curr) => {
        acc[curr] = {
          enabled: true,
          friendlyName: OAUTH_PROVIDERS[curr].friendlyName,
        };
        return acc;
      },
      {} as Record<OAuthProvider, { enabled: true; friendlyName: string }>
    ),
    oauthEnabled:
      WG_ENV.OAUTH_PROVIDERS !== undefined && WG_ENV.OAUTH_PROVIDERS.length > 0,
    passwordDisabled: WG_ENV.DISABLE_PASSWORD_AUTH,
    autoLaunchProvider: WG_ENV.OAUTH_AUTO_LAUNCH,
  };
});
