/* First setup of wg-easy app */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);

  if (
    url.pathname === '/setup' ||
    url.pathname === '/api/account/setup' ||
    url.pathname === '/api/features'
  ) {
    return;
  }

  const users = await Database.user.findAll();
  if (users.length === 0) {
    if (url.pathname.startsWith('/api/')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid State',
      });
    }
    return sendRedirect(event, '/setup', 302);
  }
});
