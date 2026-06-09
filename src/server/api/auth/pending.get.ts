export default defineEventHandler(async (event) => {
  const session = await useWGSession(event);

  if (!session.data.pendingLogin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No pending authentication',
    });
  }

  return {
    type: session.data.pendingLogin.type,
  };
});
