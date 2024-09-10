export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  if (
    !url.pathname.startsWith('/api/') ||
    url.pathname === '/api/account/setup' ||
    url.pathname === '/api/session' ||
    url.pathname === '/api/lang' ||
    url.pathname === '/api/release' ||
    url.pathname === '/api/features'
  ) {
    return;
  }
  const system = await Database.system.get();

  const session = await getSession(event, system.sessionConfig);
  if (session.id && session.data.authenticated) {
    return;
  }

  const authorization = getHeader(event, 'Authorization');
  if (url.pathname.startsWith('/api/') && authorization) {
    const users = await Database.user.findAll();
    const user = users.find((user) => user.id == session.data.userId);
    if (!user)
      throw createError({
        statusCode: 401,
        statusMessage: 'Session failed',
      });

    const userHashPassword = user.password;
    const passwordValid = await isPasswordValid(
      authorization,
      userHashPassword
    );
    if (passwordValid) {
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
