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

test.each([
  ['wg', 'office#lan'],
  ['awg', 'office'],
])(
  'runs deferred %s hooks with the interface, table, and native comment semantics',
  async (backend, label) => {
    vi.resetModules();
    config.WG_EXECUTABLE = backend;
    try {
      const { wg: backendWg } = await import('#server/utils/wgHelper');
      exec.mockImplementation(async (script, { env }) =>
        (await runBash('bash', ['-c', script], { env })).stdout.trim()
      );
      expect(
        await backendWg.postUp(
          'wg0',
          '100',
          'echo %i "$INTERFACE" "$TABLE" office#lan'
        )
      ).toBe(`wg0 wg0 100 ${label}`);
      await expect(
        backendWg.postUp('wg0', '100', 'false | true')
      ).rejects.toThrow();
    } finally {
      config.WG_EXECUTABLE = 'wg';
    }
  }
);
