import { describe, expect, test } from 'vitest';

import { ClientBulkToggleSchema } from '../../server/database/repositories/client/types';

describe('ClientBulkToggleSchema', () => {
  test('accepts one or more numeric client IDs and an enabled flag', () => {
    expect(
      ClientBulkToggleSchema.parse({ clientIds: [1, 2], enabled: false })
    ).toEqual({
      clientIds: [1, 2],
      enabled: false,
    });
  });

  test('rejects an empty bulk operation', () => {
    expect(() =>
      ClientBulkToggleSchema.parse({ clientIds: [], enabled: true })
    ).toThrow();
  });
});
