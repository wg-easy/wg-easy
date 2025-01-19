import type { EventHandlerRequest, EventHandlerResponse, H3Event } from 'h3';
import type { UserType } from '#db/repositories/user/types';
import type { SetupStepType } from '../database/repositories/general/types';

type PermissionHandler<
  TReq extends EventHandlerRequest,
  TRes extends EventHandlerResponse,
> = { (params: { event: H3Event<TReq>; user: UserType }): TRes };

/**
 * check if the user has the permission to perform the action
 */
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

type SetupHandler<
  TReq extends EventHandlerRequest,
  TRes extends EventHandlerResponse,
> = { (params: { event: H3Event<TReq>; setup: SetupStepType }): TRes };

/**
 * check if the setup is done, if not, run the handler
 */
export const defineSetupEventHandler = <
  TReq extends EventHandlerRequest,
  TRes extends EventHandlerResponse,
>(
  handler: SetupHandler<TReq, TRes>
) => {
  return defineEventHandler(async (event) => {
    const setup = await Database.general.getSetupStep();

    if (setup.done) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid state',
      });
    }

    return await handler({ event, setup });
  });
};
