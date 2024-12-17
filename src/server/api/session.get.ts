export default defineEventHandler(async (event) => {
  const session = await useWGSession(event);

  if (!session.data.userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not logged in',
    });
  }
  const user = await Database.user.findById(session.data.userId);
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found in Database',
    });
  }

  return {
    role: user.role,
    username: user.username,
    name: user.name,
    email: user.email,
  };
});
