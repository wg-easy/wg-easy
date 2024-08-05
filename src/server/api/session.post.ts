export default defineEventHandler(async (event) => {
  const session = await useSession(event, SESSION_CONFIG);
  const { password } = await readBody(event);

  if (!REQUIRES_PASSWORD) {
    // if no password is required, the API should never be called.
    // Do not automatically authenticate the user.
    throw createError({
      status: 401,
      message: 'Invalid state',
    });
  }

  if (!isPasswordValid(password)) {
    throw createError({
      status: 401,
      message: 'Incorrect Password',
    });
  }

  const data = await session.update({
    authenticated: true,
  });

  SERVER_DEBUG(`New Session: ${data.id}`);

  return { success: true };
});
