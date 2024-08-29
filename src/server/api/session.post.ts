import type { SessionConfig } from 'h3';

export default defineEventHandler(async (event) => {
  const { username, password, remember } = await readValidatedBody(
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

  const users = await Database.getUsers();
  const user = users.find((user) => user.username == username);
  if (!user)
    throw createError({
      statusCode: 400,
      statusMessage: 'User with username does not exist',
    });

  const userHashPassword = user.password;
  if (!isPasswordValid(password, userHashPassword)) {
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
    userId: user.id,
  });

  SERVER_DEBUG(`New Session: ${data.id}`);

  return { success: true, requiresPassword: REQUIRES_PASSWORD };
});
