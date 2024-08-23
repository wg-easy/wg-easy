import type { SessionConfig } from 'h3';

export default defineEventHandler(async (event) => {
  const { password, remember } = await readValidatedBody(
    event,
    validateZod(passwordType)
  );

  if (!REQUIRES_PASSWORD) {
    // if no password is required, the API should never be called.
    // Do not automatically authenticate the user.
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid state',
    });
  }
  if (!isPasswordValid(password, PASSWORD_HASH)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Incorrect Password',
    });
  }

  const conf: SessionConfig = SESSION_CONFIG;
  if (MAX_AGE && remember) {
    conf.cookie = {
      ...(SESSION_CONFIG.cookie ?? {}),
      maxAge: MAX_AGE,
    };
  }

  const session = await useSession(event, {
    ...SESSION_CONFIG,
  });

  const data = await session.update({
    authenticated: true,
  });

  SERVER_DEBUG(`New Session: ${data.id}`);

  return { success: true, requiresPassword: REQUIRES_PASSWORD };
});
