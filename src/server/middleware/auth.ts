export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const session = await useWGSession(event);

  if (url.pathname === '/login') {
    if (session.data.userId) {
      return sendRedirect(event, '/', 302);
    }
  }

  if (url.pathname === '/') {
    if (!session.data.userId) {
      return sendRedirect(event, '/login', 302);
    }
  }

  if (url.pathname.startsWith('/admin')) {
    if (!session.data.userId) {
      return sendRedirect(event, '/login', 302);
    }
    const user = await Database.user.findById(session.data.userId);
    if (!user) {
      return sendRedirect(event, '/login', 302);
    }
    if (!user.enabled || user.role !== 'ADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Not allowed to access Admin Panel',
      });
    }
  }
});
