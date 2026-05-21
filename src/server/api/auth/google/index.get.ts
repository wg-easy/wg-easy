export default defineEventHandler(async (event) => {
  if (!OAUTH_GOOGLE_ENV.ENABLED) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Google OAuth is not enabled',
    });
  }

  const host = getRequestHost(event);
  const protocol = WG_ENV.INSECURE ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

  const state = crypto.randomUUID();

  // Store state in session to prevent CSRF
  const session = await useWGSession(event);
  await session.update({ oauthState: state });

  const params = new URLSearchParams({
    client_id: OAUTH_GOOGLE_ENV.CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  return sendRedirect(
    event,
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
});
