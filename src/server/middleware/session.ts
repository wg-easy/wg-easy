import type { User } from '~~/services/database/repositories/user';

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  // If one method of a route is public, every method is public!
  // Handle api routes
  if (
    !url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/api/setup/') ||
    url.pathname === '/api/session' ||
    url.pathname === '/api/lang' ||
    url.pathname === '/api/release'
  ) {
    return;
  }
  const system = await Database.system.get();

  const session = await getSession<WGSession>(event, system.sessionConfig);
  const authorization = getHeader(event, 'Authorization');

  let user: User | undefined = undefined;
  if (session.data.userId) {
    // Handle if authenticating using Session
    user = await Database.user.findById(session.data.userId);
  } else if (authorization) {
    // Handle if authenticating using Header
    const [method, value] = authorization.split(' ');
    // Support Basic Authentication
    // TODO: support personal access token or similar
    if (method !== 'Basic' || !value) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Session failed',
      });
    }

    const basicValue = Buffer.from(value, 'base64').toString('utf-8');

    // Split by first ":"
    const index = basicValue.indexOf(':');
    const username = basicValue.substring(0, index);
    const password = basicValue.substring(index + 1);

    if (!username || !password) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Session failed',
      });
    }

    const users = await Database.user.findAll();
    const foundUser = users.find((v) => v.username === username);

    if (!foundUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Session failed',
      });
    }

    const userHashPassword = foundUser.password;
    const passwordValid = await isPasswordValid(password, userHashPassword);

    if (!passwordValid) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Incorrect Password',
      });
    }
    user = foundUser;
  }

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not logged in',
    });
  }

  if (!user.enabled) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Account is disabled',
    });
  }

  if (url.pathname.startsWith('/api/admin')) {
    if (user.role !== 'ADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Missing Permissions',
      });
    }
  }
});
