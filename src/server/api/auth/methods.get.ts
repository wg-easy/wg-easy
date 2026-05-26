export default defineEventHandler(() => {
  return {
    providers: WG_ENV.OAUTH_PROVIDERS?.reduce(
      (acc, curr) => {
        acc[curr] = true;
        return acc;
      },
      {} as Record<OAUTH_PROVIDER, boolean>
    ),
    oauthEnabled:
      WG_ENV.OAUTH_PROVIDERS !== undefined && WG_ENV.OAUTH_PROVIDERS.length > 0,
  };
});
