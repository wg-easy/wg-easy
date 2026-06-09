import { UserLoginSchema } from '#db/repositories/user/types';

export default defineEventHandler(async (event) => {
  if (WG_ENV.DISABLE_PASSWORD_AUTH) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Password authentication is disabled',
    });
  }

  const { username, password, remember } = await readValidatedBody(
    event,
    validateZod(UserLoginSchema, event)
  );

  const result = await Database.users.login(username, password);

  const session = await useWGSession(event, remember);

  // TODO: add localization support

  if (!result.success) {
    switch (result.error) {
      case 'INCORRECT_CREDENTIALS':
        throw createError({
          statusCode: 401,
          statusMessage: 'Invalid username or password',
        });
      case 'TOTP_REQUIRED':
        await session.update({
          pendingLogin: {
            type: 'password',
            userId: result.userId,
            remember,
          },
        });
        return { status: 'TOTP_REQUIRED' as const };
      case 'INVALID_TOTP_CODE':
        return { status: 'INVALID_TOTP_CODE' as const };
      case 'USER_DISABLED':
        throw createError({
          statusCode: 401,
          statusMessage: 'User disabled',
        });
      case 'UNEXPECTED_ERROR':
        throw createError({
          statusCode: 500,
          statusMessage: 'Unexpected error',
        });
    }
    assertUnreachable(result);
  }

  const user = result.user;

  const data = await session.update({
    userId: user.id,
  });

  // TODO?: create audit log

  SERVER_DEBUG(`New Session: ${data.id} for ${user.id} (${user.username})`);

  return { status: 'success' as const };
});
