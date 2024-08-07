export default defineEventHandler(async (event) => {
  const session = await useWGSession(event);
  const sessionId = session.id;

  if (sessionId === undefined) {
    return createError({
      status: 401,
      message: 'Not logged in'
    })
  }

  await session.clear();

  SERVER_DEBUG(`Deleted Session: ${sessionId}`);
  return { success: true };
});
