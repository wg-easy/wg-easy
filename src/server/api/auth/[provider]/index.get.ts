import * as client from 'openid-client';

export default defineEventHandler(async (event) => {
  const { config, provider, providerConfig } = await buildOauthConfig(event);

  const host = getRequestHost(event);
  const protocol = WG_ENV.INSECURE ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/${provider}/callback`;

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const nonce = client.randomNonce();
  const state = client.randomState();

  const parameters: Record<string, string> = {
    redirect_uri: redirectUri,
    scope: providerConfig.scope,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    nonce: nonce,
    state: state,
  };

  const session = await useWGSession(event);
  await session.update({
    oauth_nonce: nonce,
    oauth_verifier: codeVerifier,
    oauth_state: state,
  });

  const redirectTo = client.buildAuthorizationUrl(config, parameters);

  return sendRedirect(event, redirectTo.toString());
});
