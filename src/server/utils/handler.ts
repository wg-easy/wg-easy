import type { EventHandlerRequest, EventHandlerResponse, H3Event } from 'h3';
import type { UserType } from '#db/repositories/user/types';

type PermissionHandler<
  TReq extends EventHandlerRequest,
  TRes extends EventHandlerResponse,
> = { (params: { event: H3Event<TReq>; user: UserType }): TRes };

export const definePermissionEventHandler = <
  TReq extends EventHandlerRequest,
  TRes extends EventHandlerResponse,
>(
  action: Action,
  handler: PermissionHandler<TReq, TRes>
) => {
  return defineEventHandler(async (event) => {
    const user = await getCurrentUser(event);
    if (!checkPermissions(action, user)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
      });
    }

    return await handler({ event, user });
  });
};

/**
 * @throws
 */
async function getCurrentUser(event: H3Event) {
  const session = await getWGSession(event);

  const authorization = getHeader(event, 'Authorization');

  let user: UserType | undefined = undefined;
  if (session.data.userId) {
    // Handle if authenticating using Session
    user = await Database.users.get(session.data.userId);
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
    const userId = basicValue.substring(0, index);
    const password = basicValue.substring(index + 1);

    if (!userId || !password) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Session failed',
      });
    }

    const foundUser = await Database.users.get(Number.parseInt(userId));

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
      statusMessage: 'Session failed. User not found',
    });
  }

  if (!user.enabled) {
    throw createError({
      statusCode: 403,
      statusMessage: 'User is disabled',
    });
  }

  return user;
}
