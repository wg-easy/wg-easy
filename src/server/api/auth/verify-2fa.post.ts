import { z } from 'zod';

const Verify2faSchema = z.object({
  totpCode: z.string().min(6).max(6),
});

export default defineEventHandler(async (event) => {
  const { totpCode } = await readValidatedBody(
    event,
    validateZod(Verify2faSchema, event)
  );
  const session = await useWGSession(event);

  const pendingLogin = session.data.pendingLogin;
  if (!pendingLogin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No pending authentication',
    });
  }

  const totpStatus = await Database.users.validateTotpCode(
    pendingLogin.userId,
    totpCode
  );

  switch (totpStatus) {
    case 'INVALID_TOTP_CODE':
      return { status: 'INVALID_TOTP_CODE' as const };
    case 'USER_DISABLED':
      throw createError({
        statusCode: 401,
        statusMessage: 'User disabled',
      });
    case 'success':
      break;
    default:
      assertUnreachable(totpStatus);
  }

  await session.update({
    userId: pendingLogin.userId,
    pendingLogin: undefined,
    oauth_nonce: undefined,
    oauth_state: undefined,
    oauth_verifier: undefined,
  });

  return { status: 'success' as const };
});
