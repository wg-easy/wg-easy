import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { expect, test, vi } from 'vitest';

const { exec, config } = vi.hoisted(() => ({
  exec: vi.fn(),
  config: { WG_EXECUTABLE: 'wg' },
}));

vi.mock('#server/utils/cmd', () => ({ exec }));
vi.mock('#server/utils/config', () => ({
  WG_ENV: config,
}));

const runBash = promisify(execFile);

test.each(['wg', 'awg'])(
  'runs site-routed %s hooks in the WireGuard Bash environment',
  async (backend) => {
    vi.resetModules();
    config.WG_EXECUTABLE = backend;
    try {
      const { wg: backendWg } = await import('#server/utils/wgHelper');
      exec.mockImplementation(async (script, { env }) =>
        (await runBash('bash', ['-c', script], { env })).stdout.trim()
      );
      expect(
        await backendWg.runHook(
          'wg0',
          '100',
          'cmd echo %i "$INTERFACE" "$TABLE" "$CONFIG_FILE" office#lan "hq #1" # comment'
        )
      ).toBe('wg0 wg0 100 /etc/wireguard/wg0.conf office#lan hq #1');
      await expect(
        backendWg.runHook('wg0', '100', 'false | true')
      ).rejects.toThrow();
    } finally {
      config.WG_EXECUTABLE = 'wg';
    }
  }
);
