import { defineEventHandler, getHeader } from 'h3';
import type { EventHandlerResponse, H3Event } from 'h3';

import * as setup from '#server/features/setup';
import { authorizeMetrics } from '#server/features/settings';
import { getCurrentUser } from '#server/features/identity/session';
import type { PublicUser } from '#shared/contracts/identity';

/** Authentication belongs here; feature functions enforce resource permissions. */
export function defineAuthenticatedEventHandler<T extends EventHandlerResponse>(
  handler: (params: { event: H3Event; user: PublicUser }) => T
) {
  return defineEventHandler(async (event) => {
    const user = await getCurrentUser(event);
    return handler({ event, user });
  });
}

export function defineSetupEventHandler<T extends EventHandlerResponse>(
  step: setup.SetupAction,
  handler: (params: { event: H3Event }) => T
) {
  return defineEventHandler(async (event) => {
    await setup.assertStep(step);
    return handler({ event });
  });
}

export function defineMetricsHandler<T extends EventHandlerResponse>(
  type: 'prometheus' | 'json',
  handler: (params: { event: H3Event }) => T
) {
  return defineEventHandler(async (event) => {
    const authorization = getHeader(event, 'Authorization');
    const [method, value] = authorization?.split(' ') ?? [];
    await authorizeMetrics(
      type,
      authorization ? { method: method ?? '', value } : undefined
    );
    return handler({ event });
  });
}
