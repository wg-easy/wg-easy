export default defineEventHandler(async (event) => {
  if (event.node.req.url === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request',
    });
  }
  if (
    !REQUIRES_PASSWORD ||
    !event.node.req.url.startsWith('/api/') ||
    event.node.req.url === '/api/session' ||
    event.node.req.url === '/api/lang' ||
    event.node.req.url === '/api/release' ||
    event.node.req.url === '/api/ui-chart-type' ||
    event.node.req.url === '/api/ui-traffic-stats'
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
      statusCode: 401,
      statusMessage: 'Incorrect Password',
    });
  }

  throw createError({
    statusCode: 401,
    statusMessage: 'Not logged in',
  });
});
