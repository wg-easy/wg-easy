import { beforeEach, describe, expect, test, vi } from 'vitest';

import { wg } from '#server/utils/wgHelper';

const { exec } = vi.hoisted(() => ({ exec: vi.fn() }));

vi.mock('#server/utils/cmd', () => ({ exec }));
vi.mock('#server/utils/config', () => ({
  WG_ENV: { WG_EXECUTABLE: 'wg' },
}));

describe('sync', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('restores the fwmark set by wg-quick after syncconf', async () => {
    exec.mockImplementation(async (command: string) =>
      command === 'wg show wg0 fwmark' ? '0xca6c' : ''
    );
    await wg.sync('wg0');
    expect(exec.mock.calls.map(([command]) => command)).toEqual([
      'wg show wg0 fwmark',
      'wg syncconf wg0 <(wg-quick strip wg0)',
      'wg set wg0 fwmark 0xca6c',
    ]);
  });

  test('leaves the fwmark alone when none is set', async () => {
    exec.mockImplementation(async (command: string) =>
      command === 'wg show wg0 fwmark' ? 'off' : ''
    );
    await wg.sync('wg0');
    expect(exec).not.toHaveBeenCalledWith(
      expect.stringContaining('wg set wg0 fwmark')
    );
  });

  test('does not restore the fwmark when syncconf fails', async () => {
    exec.mockImplementation(async (command: string) => {
      if (command === 'wg show wg0 fwmark') return '0xca6c';
      if (command.includes(' syncconf ')) throw new Error('Sync failed');
      return '';
    });
    await expect(wg.sync('wg0')).rejects.toThrow('Sync failed');
    expect(exec).toHaveBeenCalledTimes(2);
  });
});
