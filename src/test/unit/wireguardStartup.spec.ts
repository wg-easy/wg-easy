import { beforeEach, describe, expect, test, vi } from 'vitest';

import WireGuard from '#server/utils/WireGuard';

const mocks = vi.hoisted(() => ({
  env: { WG_EXECUTABLE: 'awg', DISABLE_IPV6: false },
  getInterface: vi.fn(),
  updateInterface: vi.fn(),
  writeFile: vi.fn(),
  up: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  default: { writeFile: mocks.writeFile },
}));
vi.mock('#server/utils/config', () => ({ WG_ENV: mocks.env, OLD_ENV: {} }));
vi.mock('#server/utils/Database', () => ({
  default: {
    interfaces: { get: mocks.getInterface, update: mocks.updateInterface },
    clients: { getAll: vi.fn().mockResolvedValue([]) },
    hooks: { get: vi.fn().mockResolvedValue({}) },
    userConfigs: { get: vi.fn().mockResolvedValue({}) },
  },
}));
vi.mock('#server/utils/wgHelper', () => ({
  wg: {
    generateServerInterface: vi.fn().mockReturnValue('[Interface]'),
    down: vi.fn().mockResolvedValue(undefined),
    up: mocks.up,
    sync: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('#server/utils/firewall', () => ({
  firewall: { rebuildRules: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('#server/utils/qr', () => ({ encodeQRCode: vi.fn() }));
vi.mock('#shared/utils/time', () => ({ setIntervalImmediately: vi.fn() }));

describe('AWG header initialization at startup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.WG_EXECUTABLE = 'awg';
    mocks.getInterface.mockResolvedValue({
      name: 'wg0',
      privateKey: 'existing-private-key',
      publicKey: 'existing-public-key',
      h1: '0',
      h2: '0',
      h3: '0',
      h4: '0',
      firewallEnabled: false,
    });
    mocks.updateInterface.mockResolvedValue(undefined);
    mocks.up.mockResolvedValue(undefined);
    mocks.writeFile.mockResolvedValue(undefined);
  });

  test('waits for headers to be saved before writing or starting the interface', async () => {
    let finishSaving!: () => void;
    mocks.updateInterface.mockReturnValue(
      new Promise<void>((resolve) => {
        finishSaving = resolve;
      })
    );
    const startup = WireGuard.Startup();
    await vi.waitFor(() =>
      expect(mocks.updateInterface).toHaveBeenCalledOnce()
    );
    expect(mocks.writeFile).not.toHaveBeenCalled();
    expect(mocks.up).not.toHaveBeenCalled();
    finishSaving();
    await startup;
    expect(mocks.up).toHaveBeenCalledWith('wg0');
  });

  test('does not start the interface if saving headers fails', async () => {
    mocks.updateInterface.mockRejectedValue(new Error('Database write failed'));
    await expect(WireGuard.Startup()).rejects.toThrow('Database write failed');
    expect(mocks.writeFile).not.toHaveBeenCalled();
    expect(mocks.up).not.toHaveBeenCalled();
  });

  test('does not generate AWG headers in WireGuard mode', async () => {
    mocks.env.WG_EXECUTABLE = 'wg';
    await WireGuard.Startup();
    expect(mocks.updateInterface).not.toHaveBeenCalled();
  });

  test('preserves headers already saved for an AWG interface', async () => {
    mocks.getInterface.mockResolvedValue({
      name: 'awg0',
      privateKey: 'existing-private-key',
      publicKey: 'existing-public-key',
      h1: '123',
      firewallEnabled: false,
    });
    await WireGuard.Startup();
    expect(mocks.updateInterface).not.toHaveBeenCalled();
  });
});
