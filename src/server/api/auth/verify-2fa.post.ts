import { z } from 'zod';

const Verify2faSchema = z.object({
  totpCode: z.string().min(6).max(6),
});

export default defineEventHandler(async (event) => {
  const { totpCode } = await readValidatedBody(
    event,
    validateZod(Verify2faSchema, event)
  );
  const session = await useWGSession(event, false);

  const pendingLogin = session.data.pendingLogin;
  if (!pendingLogin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No pending authentication',
    });
  }

  const isValid = await Database.users.validateTotpCode(
    pendingLogin.userId,
    totpCode
  );

  if (!isValid) {
    return { status: 'INVALID_TOTP_CODE' as const };
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
