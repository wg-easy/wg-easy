import { beforeEach, describe, expect, test, vi } from 'vitest';

import { exec } from '#server/utils/cmd';
import { wg } from '#server/utils/wgHelper';

vi.mock('#server/utils/cmd', () => ({
  exec: vi.fn().mockResolvedValue(''),
}));

vi.mock('#server/utils/config', () => ({
  WG_ENV: { WG_EXECUTABLE: 'wg' },
}));

const execMock = vi.mocked(exec);

describe('wg.sync', () => {
  beforeEach(() => {
    execMock.mockReset();
    execMock.mockResolvedValue('');
  });

  test('adds missing routes for Server Allowed IPs', async () => {
    execMock.mockImplementation(async (command) => {
      if (command === 'wg show wg0 allowed-ips') {
        return 'public-key\t10.8.0.2/32 192.168.120.0/22';
      }
      if (command === 'wg-quick strip wg0') {
        return '# Client: do not route 203.0.113.0/24\n[Peer]\nAllowedIPs = 10.8.0.2/32, 192.168.120.0/22';
      }
      if (command.includes('match 10.8.0.2/32')) {
        return '10.8.0.0/24 dev wg0 proto kernel';
      }
      return '';
    });

    await wg.sync('wg0', 'auto');

    expect(execMock).toHaveBeenCalledWith(
      'wg syncconf wg0 <(wg-quick strip wg0)'
    );
    expect(execMock).toHaveBeenCalledWith(
      'ip -4 route add 192.168.120.0/22 dev wg0'
    );
    expect(execMock).not.toHaveBeenCalledWith(
      'ip -4 route add 10.8.0.2/32 dev wg0'
    );
    expect(execMock).not.toHaveBeenCalledWith(
      expect.stringContaining('203.0.113.0/24')
    );
  });

  test('removes routes no longer present in Server Allowed IPs', async () => {
    execMock.mockImplementation(async (command) => {
      if (command === 'wg show wg0 allowed-ips') {
        return 'public-key\t10.8.0.2/32 192.168.120.0/22';
      }
      if (command === 'wg-quick strip wg0') {
        return '[Peer]\nAllowedIPs = 10.8.0.2/32';
      }
      if (command.includes('match 10.8.0.2/32')) {
        return '10.8.0.0/24 dev wg0 proto kernel';
      }
      return '';
    });

    await wg.sync('wg0', 'auto');

    expect(execMock).toHaveBeenCalledWith(
      'ip -4 route delete 192.168.120.0/22 dev wg0 2>/dev/null || true'
    );
  });

  test('uses the configured routing table', async () => {
    execMock.mockImplementation(async (command) => {
      if (command === 'wg show wg0 allowed-ips') {
        return 'public-key\t10.8.0.2/32';
      }
      if (command === 'wg-quick strip wg0') {
        return '[Peer]\nAllowedIPs = 10.8.0.2/32, 2001:db8:1::/64';
      }
      return '';
    });

    await wg.sync('wg0', '123');

    expect(execMock).toHaveBeenCalledWith(
      'ip -4 route replace 10.8.0.2/32 dev wg0 table 123'
    );
    expect(execMock).toHaveBeenCalledWith(
      'ip -6 route replace 2001:db8:1::/64 dev wg0 table 123'
    );
  });

  test('does not create routes when routing is disabled', async () => {
    execMock.mockImplementation(async (command) => {
      if (command === 'wg show wg0 allowed-ips') {
        return 'public-key\t10.8.0.2/32';
      }
      if (command === 'wg-quick strip wg0') {
        return '[Peer]\nAllowedIPs = 10.8.0.2/32, 192.168.120.0/22';
      }
      return '';
    });

    await wg.sync('wg0', 'off');

    expect(execMock).toHaveBeenCalledWith(
      'wg syncconf wg0 <(wg-quick strip wg0)'
    );
    expect(execMock).not.toHaveBeenCalledWith(expect.stringMatching(/^ip /));
  });

  test('restarts wg-quick when its policy-routed default changes', async () => {
    execMock.mockImplementation(async (command) => {
      if (command === 'wg show wg0 allowed-ips') {
        return 'public-key\t10.8.0.2/32';
      }
      if (command === 'wg-quick strip wg0') {
        return '[Peer]\nAllowedIPs = 10.8.0.2/32, 0.0.0.0/0';
      }
      return '';
    });

    await wg.sync('wg0', 'auto');

    expect(execMock).toHaveBeenCalledWith('wg-quick down wg0; wg-quick up wg0');
    expect(execMock).not.toHaveBeenCalledWith(
      'wg syncconf wg0 <(wg-quick strip wg0)'
    );
  });
});
