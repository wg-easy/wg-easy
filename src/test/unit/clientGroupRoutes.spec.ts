import { createEvent } from 'h3';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { roles } from '../../shared/utils/permissions';

const mockDatabase = {
  clientGroups: {
    assignClient: vi.fn(),
    create: vi.fn(),
    getClientGroups: vi.fn(),
    getDetails: vi.fn(),
    listMembership: vi.fn(),
    list: vi.fn(),
    removeClient: vi.fn(),
    setClientGroups: vi.fn(),
  },
  clients: {
    get: vi.fn(),
  },
};

const mockGetCurrentUser = vi.fn();

vi.mock('#server/utils/Database', () => ({
  default: mockDatabase,
}));

vi.mock('#server/utils/session', () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock('#server/utils/WireGuard', () => ({
  default: {
    saveConfig: vi.fn(),
  },
}));

function createH3Event(
  url: string,
  options: RequestInit & { params?: Record<string, string> } = {}
) {
  const event = createEvent(new Request(url, options));
  event.context.params = options.params;

  return event;
}

describe('client group route handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({
      id: 1,
      username: 'admin',
      password: 'hash',
      email: null,
      name: 'Administrator',
      role: roles.ADMIN,
      totpKey: null,
      totpVerified: false,
      enabled: true,
      oauthProvider: null,
      oauthId: null,
      createdAt: '',
      updatedAt: '',
    });
  });

  test('rejects non-admin access before reaching the list handler', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      id: 2,
      username: 'client',
      password: 'hash',
      email: null,
      name: 'Client',
      role: roles.CLIENT,
      totpKey: null,
      totpVerified: false,
      enabled: true,
      oauthProvider: null,
      oauthId: null,
      createdAt: '',
      updatedAt: '',
    });

    const handler = (await import('../../server/api/client-group/index.get'))
      .default;

    await expect(
      handler(createH3Event('http://wg.test/api/client-group'))
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockDatabase.clientGroups.list).not.toHaveBeenCalled();
  });

  test('allows admin access to reach the list handler', async () => {
    mockDatabase.clientGroups.list.mockResolvedValueOnce([]);
    const handler = (await import('../../server/api/client-group/index.get'))
      .default;

    await expect(
      handler(createH3Event('http://wg.test/api/client-group'))
    ).resolves.toEqual([]);
    expect(mockDatabase.clientGroups.list).toHaveBeenCalledOnce();
  });

  test('allows admin access to read minimal membership only', async () => {
    mockDatabase.clientGroups.listMembership.mockResolvedValueOnce([
      { clientId: 2, groupId: 5, position: 0 },
      { clientId: 2, groupId: 7, position: 1 },
    ]);
    const handler = (
      await import('../../server/api/client-group/membership.get')
    ).default;

    await expect(
      handler(createH3Event('http://wg.test/api/client-group/membership'))
    ).resolves.toEqual([
      { clientId: 2, groupId: 5, position: 0 },
      { clientId: 2, groupId: 7, position: 1 },
    ]);
    expect(mockDatabase.clientGroups.listMembership).toHaveBeenCalledOnce();
  });

  test('client groups route returns ordered groups for one client', async () => {
    mockDatabase.clients.get.mockResolvedValueOnce({ id: 7 });
    mockDatabase.clientGroups.getClientGroups.mockResolvedValueOnce([
      { clientId: 7, groupId: 1, groupName: 'Customers', position: 0 },
      { clientId: 7, groupId: 2, groupName: 'NAS', position: 1 },
    ]);
    const handler = (
      await import('../../server/api/client/[clientId]/groups/index.get')
    ).default;

    await expect(
      handler(
        createH3Event('http://wg.test/api/client/7/groups', {
          params: { clientId: '7' },
        })
      )
    ).resolves.toEqual([
      { clientId: 7, groupId: 1, groupName: 'Customers', position: 0 },
      { clientId: 7, groupId: 2, groupName: 'NAS', position: 1 },
    ]);
  });

  test('client groups route atomically replaces ordered group ids', async () => {
    mockDatabase.clients.get.mockResolvedValueOnce({ id: 7 });
    mockDatabase.clientGroups.setClientGroups.mockResolvedValueOnce(undefined);
    const handler = (
      await import('../../server/api/client/[clientId]/groups/index.put')
    ).default;

    await expect(
      handler(
        createH3Event('http://wg.test/api/client/7/groups', {
          method: 'PUT',
          params: { clientId: '7' },
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ groupIds: [2, 1] }),
        })
      )
    ).resolves.toEqual({ success: true });
    expect(mockDatabase.clientGroups.setClientGroups).toHaveBeenCalledWith(
      7,
      [2, 1]
    );
  });

  test('client group member routes add and remove one membership only', async () => {
    mockDatabase.clients.get.mockResolvedValue({ id: 7 });
    mockDatabase.clientGroups.assignClient.mockResolvedValueOnce(undefined);
    mockDatabase.clientGroups.removeClient.mockResolvedValueOnce(undefined);
    const addHandler = (
      await import('../../server/api/client/[clientId]/groups/[groupId]/index.post')
    ).default;
    const removeHandler = (
      await import('../../server/api/client/[clientId]/groups/[groupId]/index.delete')
    ).default;

    await expect(
      addHandler(
        createH3Event('http://wg.test/api/client/7/groups/2', {
          method: 'POST',
          params: { clientId: '7', groupId: '2' },
        })
      )
    ).resolves.toEqual({ success: true });
    await expect(
      removeHandler(
        createH3Event('http://wg.test/api/client/7/groups/2', {
          method: 'DELETE',
          params: { clientId: '7', groupId: '2' },
        })
      )
    ).resolves.toEqual({ success: true });
    expect(mockDatabase.clientGroups.assignClient).toHaveBeenCalledWith(7, 2);
    expect(mockDatabase.clientGroups.removeClient).toHaveBeenCalledWith(7, 2);
  });

  test('malformed group id rejects before lookup', async () => {
    const handler = (
      await import('../../server/api/client-group/[groupId]/index.get')
    ).default;

    await expect(
      handler(
        createH3Event('http://wg.test/api/client-group/not-a-number', {
          params: { groupId: 'not-a-number' },
        })
      )
    ).rejects.toThrow();
    expect(mockDatabase.clientGroups.getDetails).not.toHaveBeenCalled();
  });

  test('missing group returns 404', async () => {
    mockDatabase.clientGroups.getDetails.mockResolvedValueOnce(undefined);
    const handler = (
      await import('../../server/api/client-group/[groupId]/index.get')
    ).default;

    await expect(
      handler(
        createH3Event('http://wg.test/api/client-group/123', {
          params: { groupId: '123' },
        })
      )
    ).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Client group not found',
    });
  });

  test('duplicate group create returns 409', async () => {
    mockDatabase.clientGroups.create.mockRejectedValueOnce(
      new Error('Client group already exists')
    );
    const handler = (await import('../../server/api/client-group/index.post'))
      .default;

    await expect(
      handler(
        createH3Event('http://wg.test/api/client-group', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: 'Customers',
            description: null,
            allowedIps: null,
            dns: null,
            firewallIps: null,
          }),
        })
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Client group already exists',
    });
  });

  test('successful detail response does not expose client secrets', async () => {
    mockDatabase.clientGroups.getDetails.mockResolvedValueOnce({
      id: 1,
      name: 'Customers',
      description: null,
      allowedIps: null,
      dns: null,
      firewallIps: null,
      assignedClientCount: 1,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      clients: [
        {
          id: 7,
          name: 'Phone',
          enabled: true,
          ipv4Address: '10.8.0.2',
          ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:2',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    });
    const handler = (
      await import('../../server/api/client-group/[groupId]/index.get')
    ).default;

    const response = await handler(
      createH3Event('http://wg.test/api/client-group/1', {
        params: { groupId: '1' },
      })
    );

    expect(response.clients[0]).not.toHaveProperty('privateKey');
    expect(response.clients[0]).not.toHaveProperty('preSharedKey');
  });
});
