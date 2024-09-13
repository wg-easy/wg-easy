export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const session = await useWGSession(event);

  // Api handled by session, Setup handled with setup middleware
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/setup')) {
    return;
  }

  if (url.pathname === '/login') {
    if (session.data.userId) {
      return sendRedirect(event, '/', 302);
    }
    return;
  }

  // Require auth for every page other than Login
  // TODO: investigate /__nuxt_error (error page when unauthenticated)
  if (!session.data.userId) {
    return sendRedirect(event, '/login', 302);
  }

  if (url.pathname.startsWith('/admin')) {
    const user = await Database.user.findById(session.data.userId);
    if (!user) {
      return sendRedirect(event, '/login', 302);
    }
    if (user.role !== 'ADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Not allowed to access Admin Panel',
      });
    }
  }
});
