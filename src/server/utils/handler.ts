import type { EventHandlerRequest, EventHandlerResponse, H3Event } from 'h3';
import type { UserType } from '#db/repositories/user/types';
import type { SetupStepType } from '#db/repositories/general/types';
import {
  type Permissions,
  hasPermissionsWithData,
} from '#shared/utils/permissions';

type PermissionHandler<
  TReq extends EventHandlerRequest,
  TRes extends EventHandlerResponse,
  Resource extends keyof Permissions,
> = {
  (params: {
    event: H3Event<TReq>;
    user: UserType;
    /**
     * check if user has permissions to access the resource
     *
     * see: {@link hasPermissionsWithData}
     */
    checkPermissions: (data?: Permissions[Resource]['dataType']) => true;
  }): TRes;
};

/**
 * get current user
 */
export const definePermissionEventHandler = <
  TReq extends EventHandlerRequest,
  TRes extends EventHandlerResponse,
  Resource extends keyof Permissions,
>(
  resource: Resource,
  action: Permissions[Resource]['action'],
  handler: PermissionHandler<TReq, TRes, Resource>
) => {
  return defineEventHandler(async (event) => {
    const user = await getCurrentUser(event);

    const permissions = hasPermissionsWithData(user, resource, action);

    // if no data is required, check permissions
    if (permissions.isBoolean()) {
      permissions.check();
    }

    const response = await handler({
      event,
      user,
      checkPermissions: permissions.check,
    });

    // if data is required, make sure permissions were checked
    if (!permissions.checked) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Permission was not checked',
      });
    }

    return response;
  });
};

// which api route is allowed for each setup step
// 0 is done, 1 is start
// 3 means step 2 is done
const ValidSetupSteps = {
  1: [2] as const,
  3: [4, 'migrate'] as const,
} as const;

type ValidSteps =
  (typeof ValidSetupSteps)[keyof typeof ValidSetupSteps][number];

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
  step: ValidSteps,
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

    const validSetupSteps =
      ValidSetupSteps[setup.step as keyof typeof ValidSetupSteps];

    if (!validSetupSteps) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Invalid setup step',
      });
    }

    if (!validSetupSteps.includes(step as never)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid step',
      });
    }

    return await handler({ event, setup });
  });
};

type Metrics = 'prometheus' | 'json';

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
    const metricsConfig = await Database.general.getMetricsConfig();

    if (metricsConfig.password) {
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

      const tokenValid = await isPasswordValid(value, metricsConfig.password);

      if (!tokenValid) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Incorrect token',
        });
      }
    }

    if (metricsConfig[type] !== true) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Metrics not enabled',
      });
    }

    return await handler({ event });
  });
};
