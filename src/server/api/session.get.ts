export default defineEventHandler(async (event) => {
  const session = await useWGSession(event);

  if (!session.data.userId) {
    // not logged in
    return null;
  }

  const user = await Database.users.get(session.data.userId);
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found in Database',
    });
  }

  return {
    id: user.id,
    role: user.role,
    username: user.username,
    name: user.name,
    email: user.email,
    totpVerified: user.totpVerified,
  };
});
