import * as client from 'openid-client';

export default defineEventHandler(async (event) => {
  const { config, provider } = await buildOauthConfig(event);

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
    expectedNonce: session.data.oauth_nonce,
    expectedState: session.data.oauth_state,
    idTokenExpected: true,
  });

  const subject = tokens.claims()?.sub;
  if (!subject) {
    throw createError({
      statusCode: 400,
      statusMessage: "Can't get subject",
    });
  }

  const userInfo = await client.fetchUserInfo(
    config,
    tokens.access_token,
    subject
  );

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
    userInfo.email,
    userInfo.preferred_username || userInfo.name || userInfo.email
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
