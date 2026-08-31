import { describe, expect, test, vi } from 'vitest';

const databaseMock = {
  quotas: {
    assignClient: vi.fn(async () => 'quota-not-found' as const),
  },
};
const runConfigMutation = vi.fn(async (mutation: () => Promise<void>) => {
  await mutation();
});
const definePermissionEventHandlerMock = vi.fn(
  (_resource, _action, handler: (params: { event: object }) => unknown) =>
    handler
);

vi.mock('h3', async (importOriginal) => {
  const original = await importOriginal<typeof import('h3')>();
  return {
    ...original,
    getValidatedRouterParams: vi.fn(async () => ({ clientId: 1 })),
    readValidatedBody: vi.fn(async () => ({ quotaId: 999 })),
  };
});
vi.mock('#server/utils/Database', () => ({ default: databaseMock }));
vi.mock('#server/utils/WireGuard', () => ({
  default: { runConfigMutation },
}));
vi.mock('#server/utils/handler', () => ({
  definePermissionEventHandler: definePermissionEventHandlerMock,
}));
vi.mock('#server/utils/types', async (importOriginal) => {
  const original = await importOriginal<typeof import('#server/utils/types')>();
  return {
    ...original,
    validateZod: vi.fn(() => undefined),
  };
});

const { default: assignQuotaHandler } =
  await import('#server/api/client/[clientId]/quota.put');

describe('client quota assignment API', () => {
  test('requires quota update permission', () => {
    expect(definePermissionEventHandlerMock).toHaveBeenCalledWith(
      'quotas',
      'update',
      expect.any(Function)
    );
  });

  test('returns 404 when assigning a nonexistent quota', async () => {
    await expect(
      assignQuotaHandler({ event: {} } as never)
    ).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Quota not found',
    });
  });
});
