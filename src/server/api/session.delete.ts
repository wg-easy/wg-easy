export default defineEventHandler(async (event) => {
  const session = await useWGSession(event);
  const sessionId = session.id;

  if (sessionId === undefined) {
    return createError({
      statusCode: 401,
      statusMessage: 'Not logged in',
    });
  }

  await session.clear();

  SERVER_DEBUG(`Deleted Session: ${sessionId}`);
  return { success: true };
});
