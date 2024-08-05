export default defineEventHandler(async (event) => {
  const session = await useSession(event, SESSION_CONFIG);
  const authenticated = REQUIRES_PASSWORD
    ? !!(session.data && session.data.authenticated)
    : true;

  return {
    requiresPassword: REQUIRES_PASSWORD,
    authenticated,
  };
});
