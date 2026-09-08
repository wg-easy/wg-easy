import { describe, expect, test } from 'vitest';

import { hasPermissions, roles } from '#shared/utils/permissions';

const quotaActions = ['view', 'create', 'update', 'delete'] as const;

describe('quota permissions', () => {
  test.each(quotaActions)('allows an admin to %s quotas', (action) => {
    expect(hasPermissions({ id: 1, role: roles.ADMIN }, 'quotas', action)).toBe(
      true
    );
  });

  test.each(quotaActions)(
    'denies a client permission to %s quotas',
    (action) => {
      expect(
        hasPermissions({ id: 2, role: roles.CLIENT }, 'quotas', action)
      ).toBe(false);
    }
  );
});
