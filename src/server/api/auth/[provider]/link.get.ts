export default definePermissionEventHandler(
  'me',
  'update',
  async ({ event, user, checkPermissions }) => {
    checkPermissions(user);

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

    await Database.users.linkOauth(user.id, provider, userInfo.sub);

    return sendRedirect(event, '/me');
  }
);
