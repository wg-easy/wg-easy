import { createError } from 'h3';

import { hasPermissions, type Permissions } from '#shared/utils/permissions';
import type { Actor } from '#shared/contracts/identity';

export function authorize<Resource extends keyof Permissions>(
  actor: Actor,
  resource: Resource,
  action: Permissions[Resource]['action'],
  data?: Permissions[Resource]['dataType']
) {
  if (!hasPermissions(actor, resource, action, data)) {
    throw createError({ statusCode: 403, statusMessage: 'Permission denied' });
  }
}
