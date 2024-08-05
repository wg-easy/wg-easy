export default defineEventHandler(async (event) => {
  if (event.node.req.url === undefined) {
    throw createError({
      status: 400,
      message: 'Invalid request',
    });
  }
  if (
    !REQUIRES_PASSWORD ||
    !event.node.req.url.startsWith('/api/') ||
    event.node.req.url === '/api/session'
  ) {
    return;
  }
  const session = await getSession(event, SESSION_CONFIG);
  if (session.id && session.data.authenticated) {
    return;
  }

  const authorization = getHeader(event, 'Authorization');
  if (event.node.req.url.startsWith('/api/') && authorization) {
    if (isPasswordValid(authorization)) {
      return;
    }
    throw createError({
      status: 401,
      message: 'Incorrect Password',
    });
  }

  throw createError({
    status: 401,
    message: 'Not logged in',
  });
});
