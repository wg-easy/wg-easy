export default defineEventHandler(async (event) => {
  const session = await useWGSession(event);
  const { password } = await readValidatedBody(
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
  if (!isPasswordValid(password)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Incorrect Password',
    });
  }

  const data = await session.update({
    authenticated: true,
  });

  SERVER_DEBUG(`New Session: ${data.id}`);

  return { success: true, requiresPassword: REQUIRES_PASSWORD };
});
