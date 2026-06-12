export default defineEventHandler(async (event) => {
  const session = await useWGSession(event);

  if (!session.data.userId || session.data.pendingLogin) {
    // not logged in
    throw createError({
      statusCode: 401,
      statusMessage: 'Not authenticated',
    });
  }

  const user = await Database.users.get(session.data.userId);
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found in Database',
    });
  }
  if (!user.enabled) {
    throw createError({
      statusCode: 403,
      statusMessage: 'User is disabled',
    });
  }

  return {
    id: user.id,
    role: user.role,
    username: user.username,
    name: user.name,
    email: user.email,
    totpVerified: user.totpVerified,
    oauthProvider: user.oauthProvider,
    hasPassword: user.password !== null,
  } satisfies SharedPublicUser;
});
