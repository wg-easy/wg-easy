export default defineEventHandler(async (event) => {
  const session = await useWGSession(event);
  const authenticated = REQUIRES_PASSWORD
    ? session.data.authenticated
    : true;

  return {
    requiresPassword: REQUIRES_PASSWORD,
    authenticated,
  };
});
