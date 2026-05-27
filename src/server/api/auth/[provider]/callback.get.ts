import * as client from 'openid-client';

export default defineEventHandler(async (event) => {
  const { config, provider, providerConfig } = await buildOauthConfig(event);

  const session = await useWGSession(event);
  if (
    !session.data.oauth_nonce ||
    !session.data.oauth_verifier ||
    !session.data.oauth_state
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing OAuth State',
    });
  }

  const currentUrl = getRequestURL(event);

  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: session.data.oauth_verifier,
    expectedNonce:
      providerConfig.isOIDC === false ? undefined : session.data.oauth_nonce,
    expectedState: session.data.oauth_state,
    idTokenExpected: providerConfig.isOIDC ?? true,
  });

  type SubjectType = string | undefined | typeof client.skipSubjectCheck;
  let subject: SubjectType = tokens.claims()?.sub;
  if (providerConfig.isOIDC === false) {
    subject = client.skipSubjectCheck;
  }

  if (!subject) {
    throw createError({
      statusCode: 400,
      statusMessage: "Can't get subject",
    });
  }

  let userInfo;
  if (providerConfig.userInfoFlow === 'github') {
    userInfo = await githubUserInfoFlow(tokens.access_token);
  } else {
    userInfo = await client.fetchUserInfo(config, tokens.access_token, subject);
  }

  if (!userInfo.sub) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No sub set',
    });
  }

  if (!userInfo.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No email set',
    });
  }

  if (!userInfo.email_verified) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Email is not verified',
    });
  }

  const result = await Database.users.findOrCreateByProvider(
    provider,
    userInfo.sub,
    userInfo.preferred_username || userInfo.email,
    userInfo.email,
    userInfo.name || 'User'
  );

  if (!result.success) {
    if (result.error === 'USER_DISABLED') {
      throw createError({
        statusCode: 401,
        statusMessage: 'User disabled',
      });
    }
    if (result.error === 'USER_ALREADY_LINKED') {
      throw createError({
        statusCode: 401,
        statusMessage: 'User already linked with different account or provider',
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Unexpected error',
    });
  }

  // Create session
  const data = await session.update({
    userId: result.user.id,
    oauth_nonce: undefined,
    oauth_state: undefined,
    oauth_verifier: undefined,
  });

  SERVER_DEBUG(
    `New OAuth Session: ${data.id} for ${result.user.id} (${result.user.username}) with ${provider}`
  );

  return sendRedirect(event, '/');
});
