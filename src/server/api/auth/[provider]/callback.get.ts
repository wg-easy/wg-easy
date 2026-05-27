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

  const userInfo = await getUserInfo(
    event,
    config,
    {
      oauth_nonce: session.data.oauth_nonce,
      oauth_verifier: session.data.oauth_verifier,
      oauth_state: session.data.oauth_state,
    },
    providerConfig
  );

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
