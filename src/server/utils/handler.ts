import { defineEventHandler, type RequestEvent } from 'nuxt/server';

import * as setup from '#server/features/setup';
import { authorizeMetrics } from '#server/features/settings';
import { getCurrentUser } from '#server/features/identity/session';
import type { PublicUser } from '#shared/contracts/identity';

/**
 * Authentication belongs here; feature functions enforce resource permissions.
 */
export function defineAuthenticatedEventHandler<T>(
  handler: (params: { event: RequestEvent; user: PublicUser }) => T
) {
  return defineEventHandler(async (event) => {
    const user = await getCurrentUser(event);
    return handler({ event, user });
  });
}

export function defineSetupEventHandler<T>(
  step: setup.SetupAction,
  handler: (params: { event: RequestEvent }) => T
) {
  return defineEventHandler(async (event) => {
    await setup.assertStep(step);
    return handler({ event });
  });
}

export function defineMetricsHandler<T>(
  type: 'prometheus' | 'json',
  handler: (params: { event: RequestEvent }) => T
) {
  return defineEventHandler(async (event) => {
    const authorization = event.req.headers.get('authorization');
    const [method, value] = authorization?.split(' ') ?? [];
    await authorizeMetrics(
      type,
      authorization ? { method: method ?? '', value } : undefined
    );
    return handler({ event });
  });
}
