/* First setup of wg-easy app */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);

  // User can't be logged in, and public routes can be accessed whenever
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  const users = await Database.user.findAll();
  if (users.length === 0) {
    // If not setup
    if (url.pathname.startsWith('/setup')) {
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid State',
      });
    }
    return sendRedirect(event, '/setup', 302);
  } else {
    // If already set up
    if (!url.pathname.startsWith('/setup')) {
      return;
    }
    return sendRedirect(event, '/login', 302);
  }
});
