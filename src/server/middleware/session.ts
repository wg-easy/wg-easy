export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  if (
    !url.pathname.startsWith('/api/') ||
    url.pathname === '/api/account/new' ||
    url.pathname === '/api/session' ||
    url.pathname === '/api/lang' ||
    url.pathname === '/api/release' ||
    url.pathname === '/api/ui-chart-type' ||
    url.pathname === '/api/ui-traffic-stats'
  ) {
    return;
  }
  const system = await Database.getSystem();
  if (!system)
    throw createError({
      statusCode: 500,
      statusMessage: 'Invalid',
    });

  const session = await getSession(event, system.sessionConfig);
  if (session.id && session.data.authenticated) {
    return;
  }

  const authorization = getHeader(event, 'Authorization');
  if (url.pathname.startsWith('/api/') && authorization) {
    const users = await Database.getUsers();
    const user = users.find((user) => user.id == session.data.userId);
    if (!user)
      throw createError({
        statusCode: 401,
        statusMessage: 'Session failed',
      });

    const userHashPassword = user.password;
    if (isPasswordValid(authorization, userHashPassword)) {
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
