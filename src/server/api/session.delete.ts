export default defineEventHandler(async (event) => {
  const session = await useSession(event, SESSION_CONFIG);
  const sessionId = session.id;

  await session.clear();

  SERVER_DEBUG(`Deleted Session: ${sessionId}`);
  return { success: true };
});
