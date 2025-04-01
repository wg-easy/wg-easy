import { UserLoginSchema } from '#db/repositories/user/types';

export default defineEventHandler(async (event) => {
  const { username, password, remember, totpCode } = await readValidatedBody(
    event,
    validateZod(UserLoginSchema, event)
  );

  const result = await Database.users.login(username, password, totpCode);

  // TODO: add localization support

  if (!result.success) {
    switch (result.error) {
      case 'INCORRECT_CREDENTIALS':
        throw createError({
          statusCode: 401,
          statusMessage: 'Invalid username or password',
        });
      case 'TOTP_REQUIRED':
        return { status: 'TOTP_REQUIRED' };
      case 'INVALID_TOTP_CODE':
        return { status: 'INVALID_TOTP_CODE' };
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
    assertUnreachable(result.error);
  }

  const user = result.user;

  const session = await useWGSession(event, remember);

  const data = await session.update({
    userId: user.id,
  });

  // TODO?: create audit log

  SERVER_DEBUG(`New Session: ${data.id} for ${user.id} (${user.username})`);

  return { status: 'success' };
});
