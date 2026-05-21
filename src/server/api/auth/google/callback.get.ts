import { z } from 'zod';

const CallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

export default defineEventHandler(async (event) => {
  if (!OAUTH_GOOGLE_ENV.ENABLED) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Google OAuth is not enabled',
    });
  }

  const query = await getValidatedQuery(
    event,
    validateZod(CallbackQuerySchema, event)
  );

  // Verify state to prevent CSRF
  const session = await useWGSession(event);
  if (!session.data.oauthState || session.data.oauthState !== query.state) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid OAuth state',
    });
  }

  // Clear the state
  await session.update({ oauthState: undefined });

  const host = getRequestHost(event);
  const protocol = WG_ENV.INSECURE ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

  // Exchange code for tokens
  const tokenResponse = await $fetch<GoogleTokenResponse>(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      body: {
        code: query.code,
        client_id: OAUTH_GOOGLE_ENV.CLIENT_ID,
        client_secret: OAUTH_GOOGLE_ENV.CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
    }
  );

  if (!tokenResponse.access_token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Failed to obtain access token from Google',
    });
  }

  // Get user info from Google
  const userInfo = await $fetch<GoogleUserInfo>(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
      },
    }
  );

  if (!userInfo.email_verified) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Google email is not verified',
    });
  }

  // Check allowed domain if configured
  if (OAUTH_GOOGLE_ENV.ALLOWED_DOMAIN) {
    const emailDomain = userInfo.email.split('@')[1];
    if (emailDomain !== OAUTH_GOOGLE_ENV.ALLOWED_DOMAIN) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Email domain is not allowed',
      });
    }
  }

  // Find or create user
  const result = await Database.users.findOrCreateByGoogle(
    userInfo.sub,
    userInfo.email,
    userInfo.name
  );

  if (!result.success) {
    if (result.error === 'USER_DISABLED') {
      throw createError({
        statusCode: 401,
        statusMessage: 'User disabled',
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Unexpected error',
    });
  }

  // Create session
  await session.update({ userId: result.user.id });

  SERVER_DEBUG(
    `New Google OAuth Session for ${result.user.id} (${result.user.username})`
  );

  return sendRedirect(event, '/');
});
