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
      {} as Record<OAUTH_PROVIDER, { enabled: true; friendlyName: string }>
    ),
    oauthEnabled:
      WG_ENV.OAUTH_PROVIDERS !== undefined && WG_ENV.OAUTH_PROVIDERS.length > 0,
    passwordDisabled: WG_ENV.DISABLE_PASSWORD_AUTH,
    autoLaunchProvider: WG_ENV.OAUTH_AUTO_LAUNCH,
  };
});
