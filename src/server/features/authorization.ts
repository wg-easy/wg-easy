import { createError } from 'nuxt/server';

import { hasPermissions, type Permissions } from '#shared/utils/permissions';
import type { Actor } from '#shared/contracts/identity';

export function authorize<Resource extends keyof Permissions>(
  actor: Actor,
  resource: Resource,
  action: Permissions[Resource]['action'],
  data?: Permissions[Resource]['dataType']
) {
  if (!hasPermissions(actor, resource, action, data)) {
    throw createError({ status: 403, statusText: 'Permission denied' });
  }
}
