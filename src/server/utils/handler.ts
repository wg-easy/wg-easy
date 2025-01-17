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
