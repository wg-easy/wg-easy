import type {
  Actor,
  Role,
  PublicUser,
  BrandedRole,
} from '#shared/contracts/identity';
export type { Role } from '#shared/contracts/identity';
export const roles = {
  ADMIN: 1 as Role,
  CLIENT: 2 as Role,
} as const;

type Roles = keyof typeof roles;

/**
 * convert role to key
 * @example roleToKey(roles.ADMIN) => 'ADMIN'
 */
export function roleToKey(role: Role) {
  const roleKey = Object.keys(roles).find(
    (key) => roles[key as Roles] === role
  );

  if (roleKey === undefined) {
    throw new Error('Invalid role');
  }

  return roleKey as Roles;
}

// TODO: https://github.com/nitrojs/nitro/issues/2758#issuecomment-2650531472

type BrandedNumber = {
  toString: unknown;
  toFixed: unknown;
  toExponential: unknown;
  toPrecision: unknown;
  valueOf: unknown;
  toLocaleString: unknown;
} & BrandedRole;

type SharedUserType = Actor | (Pick<Actor, 'id'> & { role: BrandedNumber });

export type SharedPublicUser = Omit<PublicUser, 'role'> & {
  role: BrandedNumber;
};

type PermissionCheck<Key extends keyof Permissions> =
  | boolean
  | ((user: SharedUserType, data: Permissions[Key]['dataType']) => boolean);

export type RolesWithPermissions = {
  [R in Roles]: {
    [Key in keyof Permissions]: {
      [Action in Permissions[Key]['action']]: PermissionCheck<Key>;
    };
  };
};

export type Permissions = {
  clients: {
    dataType: { id: number; userId: number };
    action: 'view' | 'create' | 'update' | 'delete' | 'custom';
  };
  admin: {
    dataType: never;
    action: 'any';
  };
  me: {
    dataType: { id: number };
    action: 'update';
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
    me: {
      update: (loggedIn, toChange) => loggedIn.id === toChange.id,
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
    me: {
      update: (loggedIn, toChange) => loggedIn.id === toChange.id,
    },
  },
} as const satisfies RolesWithPermissions;

export function hasPermissions<Resource extends keyof Permissions>(
  user: SharedUserType,
  resource: Resource,
  action: Permissions[Resource]['action'],
  data?: Permissions[Resource]['dataType']
) {
  const permission = (ROLES as RolesWithPermissions)[
    // TODO: remove typecast
    roleToKey(user.role as Role)
  ][resource][action];

  if (typeof permission === 'boolean') {
    return permission;
  }

  if (data === undefined) {
    return false;
  }

  return permission(user, data);
}
