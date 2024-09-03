/* First setup of wg-easy app */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);

  if (
    url.pathname.startsWith('/setup') ||
    url.pathname === '/api/account/new'
  ) {
    return;
  }

  const users = await Database.getUsers();
  // TODO: better error messages for api requests
  if (users.length === 0) {
    return sendRedirect(event, '/setup', 302);
  }
});
