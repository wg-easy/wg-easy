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

type Metrics = 'prometheus';

type MetricsHandler<
  TReq extends EventHandlerRequest,
  TRes extends EventHandlerResponse,
> = { (params: { event: H3Event<TReq> }): TRes };

/**
 * check if the metrics are enabled and the token is correct
 */
export const defineMetricsHandler = <
  TReq extends EventHandlerRequest,
  TRes extends EventHandlerResponse,
>(
  type: Metrics,
  handler: MetricsHandler<TReq, TRes>
) => {
  return defineEventHandler(async (event) => {
    const auth = getHeader(event, 'Authorization');

    if (!auth) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      });
    }

    const [method, value] = auth.split(' ');

    if (method !== 'Bearer' || !value) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Bearer Auth required',
      });
    }

    const metricsConfig = await Database.metrics[type].get('wg0');

    if (!metricsConfig) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Metrics not enabled',
      });
    }

    const tokenValid = await isPasswordValid(value, metricsConfig.password);

    if (!tokenValid) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Incorrect token',
      });
    }

    return await handler({ event });
  });
};
