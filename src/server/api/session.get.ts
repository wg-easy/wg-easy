export default defineEventHandler(async (event) => {
  const session = await useWGSession(event);
  const authenticated = session.data.authenticated === true;

  return {
    requiresPassword: true,
    authenticated,
  };
});
