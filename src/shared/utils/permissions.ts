import type { ClientType } from '#db/repositories/client/types';
import type { UserType } from '#db/repositories/user/types';

export type Role = number & { readonly __role: unique symbol };

export const roles = {
  ADMIN: 1 as Role,
  CLIENT: 2 as Role,
} as const;

type Roles = keyof typeof roles;

/**
 * convert role to key
 * @example roleToKey(roles.ADMIN) => 'ADMIN'
 */
function roleToKey(role: Role) {
  const roleKey = Object.keys(roles).find(
    (key) => roles[key as Roles] === role
  );

  if (roleKey === undefined) {
    throw new Error('Invalid role');
  }

  return roleKey as Roles;
}

type PermissionCheck<Key extends keyof Permissions> =
  | boolean
  | ((user: UserType, data: Permissions[Key]['dataType']) => boolean);

type RolesWithPermissions = {
  [R in Roles]: {
    [Key in keyof Permissions]: {
      [Action in Permissions[Key]['action']]: PermissionCheck<Key>;
    };
  };
};

export type Permissions = {
  clients: {
    dataType: ClientType;
    action: 'view' | 'create' | 'update' | 'delete' | 'custom';
  };
  admin: {
    dataType: never;
    action: 'any';
  };
};

export const ROLES = {
  ADMIN: {
    clients: {
      view: true,
      create: true,
      update: true,
      delete: true,
      custom: true,
    },
    admin: {
      any: true,
    },
  },
  CLIENT: {
    clients: {
      view: (user, client) => user.id === client.userId,
      create: false,
      update: (user, client) => user.id === client.userId,
      delete: (user, client) => user.id === client.userId,
      custom: true,
    },
    admin: {
      any: false,
    },
  },
} as const satisfies RolesWithPermissions;

export function hasPermissions<Resource extends keyof Permissions>(
  user: UserType,
  resource: Resource,
  action: Permissions[Resource]['action'],
  data?: Permissions[Resource]['dataType']
) {
  const permission = ROLES[roleToKey(user.role)][resource][action];

  if (typeof permission === 'boolean') {
    return permission;
  }

  if (data === undefined) {
    return false;
  }

  return permission(user, data);
}

export function hasPermissionsWithData<Resource extends keyof Permissions>(
  user: UserType,
  resource: Resource,
  action: Permissions[Resource]['action']
) {
  let checked = false;
  return {
    check(data?: Permissions[Resource]['dataType']) {
      checked = true;
      const isAllowed = hasPermissions(user, resource, action, data);

      if (!isAllowed) {
        throw new Error('Permission denied');
      }

      return isAllowed;
    },
    isBoolean() {
      return typeof ROLES[roleToKey(user.role)][resource][action] === 'boolean';
    },
    get checked() {
      return checked;
    },
  };
}
