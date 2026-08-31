import { beforeEach, describe, expect, test, vi } from 'vitest';

const operationOrder: string[] = [];

const wgInterface = {
  name: 'wg0',
  firewallEnabled: false,
};

const databaseMock = {
  interfaces: {
    get: vi.fn(async () => wgInterface),
  },
  clients: {
    getAll: vi.fn(async () => []),
  },
  hooks: {
    get: vi.fn(async () => ({})),
  },
  userConfigs: {
    get: vi.fn(async () => ({})),
  },
  quotas: {
    collectClientCounters: vi.fn(async () => {
      operationOrder.push('collect');
      return false;
    }),
    checkpointClientCounters: vi.fn(async () => {
      operationOrder.push('checkpoint');
    }),
    getAll: vi.fn(async () => []),
    getDue: vi.fn(async () => []),
    reset: vi.fn(async () => false),
  },
};

vi.mock('node:fs/promises', () => ({
  default: {
    writeFile: vi.fn(async () => {
      operationOrder.push('write-config');
    }),
  },
}));
vi.mock('#server/utils/Database', () => ({ default: databaseMock }));
vi.mock('#server/utils/config', () => ({
  OLD_ENV: {},
  WG_ENV: { DISABLE_IPV6: false },
}));
vi.mock('#server/utils/firewall', () => ({
  firewall: {
    rebuildRules: vi.fn(async () => {
      operationOrder.push('firewall');
    }),
  },
}));
vi.mock('#server/utils/quotaFirewall', () => ({
  buildQuotaRuleset: vi.fn(() => 'quota rules'),
  quotaFirewall: {
    rebuild: vi.fn(async () => {
      operationOrder.push('quota-firewall');
    }),
  },
}));
vi.mock('#server/utils/qr', () => ({ encodeQRCode: vi.fn() }));
vi.mock('#server/utils/wgHelper', () => ({
  wg: {
    dump: vi.fn(async () => {
      operationOrder.push('dump');
      return [];
    }),
    generateServerInterface: vi.fn(() => '[Interface]'),
    generateServerPeer: vi.fn(() => '[Peer]'),
    sync: vi.fn(async () => {
      operationOrder.push('sync');
    }),
    restart: vi.fn(async () => {
      operationOrder.push('restart');
    }),
    down: vi.fn(async () => {
      operationOrder.push('down');
    }),
  },
}));

const { WireGuard } = await import('#server/utils/WireGuard');

describe('WireGuard quota mutation lifecycle', () => {
  beforeEach(() => {
    operationOrder.length = 0;
    vi.clearAllMocks();
    databaseMock.quotas.collectClientCounters.mockImplementation(async () => {
      operationOrder.push('collect');
      return false;
    });
  });

  test('collects old usage before mutation and checkpoints before rebuilding', async () => {
    const wireGuard = new WireGuard();

    await wireGuard.runConfigMutation(async () => {
      operationOrder.push('mutation');
    });

    expect(operationOrder).toEqual([
      'dump',
      'collect',
      'mutation',
      'checkpoint',
      'write-config',
      'sync',
      'firewall',
      'quota-firewall',
    ]);
  });

  test.each([
    ['quota creation', 'unassigned', 'assigned'],
    ['quota update', 'old quota members', 'new quota members'],
    ['quota deletion', 'assigned', 'quota deleted'],
    ['client reassignment', 'quota A', 'quota B'],
    ['assigned client disable', 'enabled', 'disabled'],
    ['assigned client deletion', 'present', 'deleted'],
  ])('preserves old counter ownership during %s', async (_, before, after) => {
    const wireGuard = new WireGuard();
    let state = before;
    let stateAtCollection: string | undefined;
    let stateAtCheckpoint: string | undefined;
    databaseMock.quotas.collectClientCounters.mockImplementationOnce(
      async () => {
        stateAtCollection = state;
        return false;
      }
    );
    databaseMock.quotas.checkpointClientCounters.mockImplementationOnce(
      async () => {
        stateAtCheckpoint = state;
      }
    );

    await wireGuard.runConfigMutation(async () => {
      state = after;
    });

    expect(stateAtCollection).toBe(before);
    expect(stateAtCheckpoint).toBe(after);
  });

  test('serializes polling collection with config mutations', async () => {
    const wireGuard = new WireGuard();
    let releaseCollection!: () => void;
    const collectionStarted = new Promise<void>((resolve) => {
      databaseMock.quotas.collectClientCounters.mockImplementationOnce(
        async () => {
          resolve();
          await new Promise<void>((release) => {
            releaseCollection = release;
          });
          return false;
        }
      );
    });
    const mutation = vi.fn(async () => undefined);

    const collection = wireGuard.collectQuotaUsage();
    await collectionStarted;
    const configMutation = wireGuard.runConfigMutation(mutation);

    expect(mutation).not.toHaveBeenCalled();
    releaseCollection();
    await Promise.all([collection, configMutation]);
    expect(mutation).toHaveBeenCalledOnce();
  });

  test('rebuilds blocked state when a mutation fails after collection', async () => {
    const wireGuard = new WireGuard();
    databaseMock.quotas.collectClientCounters.mockResolvedValueOnce(true);

    await expect(
      wireGuard.runConfigMutation(async () => {
        throw new Error('mutation failed');
      })
    ).rejects.toThrow('mutation failed');

    expect(operationOrder).toEqual([
      'dump',
      'write-config',
      'sync',
      'firewall',
      'quota-firewall',
    ]);
    expect(databaseMock.quotas.checkpointClientCounters).not.toHaveBeenCalled();
  });

  test('rebuilds blocked state when a requested quota reset does not exist', async () => {
    const wireGuard = new WireGuard();
    databaseMock.quotas.collectClientCounters.mockResolvedValueOnce(true);

    await expect(wireGuard.resetQuota(404)).resolves.toBe(false);

    expect(operationOrder).toEqual([
      'dump',
      'write-config',
      'sync',
      'firewall',
      'quota-firewall',
    ]);
    expect(databaseMock.quotas.checkpointClientCounters).not.toHaveBeenCalled();
  });

  test('collects usage before restarting the WireGuard interface', async () => {
    const wireGuard = new WireGuard();

    await wireGuard.Restart();

    expect(operationOrder).toEqual([
      'dump',
      'collect',
      'restart',
      'checkpoint',
      'write-config',
      'sync',
      'firewall',
      'quota-firewall',
    ]);
  });

  test('collects final usage before shutting down the WireGuard interface', async () => {
    const wireGuard = new WireGuard();

    await wireGuard.Shutdown();

    expect(operationOrder).toEqual(['dump', 'collect', 'down']);
  });
});
