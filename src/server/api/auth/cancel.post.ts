export default defineEventHandler(async (event) => {
  const session = await useWGSession(event, false);
  await session.update({
    pendingLogin: undefined,
    oauth_nonce: undefined,
    oauth_state: undefined,
    oauth_verifier: undefined,
  });
  return { success: true as const };
});
