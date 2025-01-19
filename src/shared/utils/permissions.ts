// TODO: implement ABAC

export const actions = {
  ADMIN: 'ADMIN',
  CLIENT: 'CLIENT',
} as const;

export type Role = number & { readonly __role: unique symbol };

export const roles = {
  ADMIN: 1 as Role,
  CLIENT: 2 as Role,
} as const;

export type Action = keyof typeof actions;

type MATRIX = {
  readonly [key in keyof typeof actions]: readonly (typeof roles)[keyof typeof roles][];
};

export const MATRIX: MATRIX = {
  [actions.ADMIN]: [roles.ADMIN] as const,
  [actions.CLIENT]: [roles.CLIENT, roles.ADMIN] as const,
} as const;

export const checkPermissions = (action: Action, user: { role: Role }) => {
  if (!MATRIX[action].includes(user.role)) {
    return false;
  }
  return true;
};
