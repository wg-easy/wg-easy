import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { describe, expect, test, vi } from 'vitest';

import { wg } from '#server/utils/wgHelper';

const { exec, config } = vi.hoisted(() => ({
  exec: vi.fn(),
  config: { WG_EXECUTABLE: 'wg' },
}));

vi.mock('#server/utils/cmd', () => ({ exec }));
vi.mock('#server/utils/config', () => ({
  WG_ENV: config,
}));

const runBash = promisify(execFile);
const stripped = '[Interface]\nListenPort = 51820\n[Peer]\nAllowedIPs = ::/0';

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

function mockWireGuard(fwmark: string, failCommand = '') {
  exec.mockImplementation(async (command: string) => {
    const stubs = `
      wg() {
        [[ "$1" != "$FAIL_COMMAND" ]] || return 42
        case "$*" in
          'show wg0 fwmark') echo "$FWMARK" ;;
          'syncconf wg0 /dev/stdin') cat ;;
          *) return 1 ;;
        esac
      }
      wg-quick() {
        [[ "$*" == 'strip wg0' ]] || return 1
        echo "$STRIPPED"
        [[ "$1" != "$FAIL_COMMAND" ]] || return 42
      }
    `;
    const { stdout } = await runBash('bash', ['-c', stubs + command], {
      env: {
        ...process.env,
        FWMARK: fwmark,
        STRIPPED: stripped,
        FAIL_COMMAND: failCommand,
      },
    });
    return stdout;
  });
}

describe('sync', () => {
  test.each(['0xca6d', 'off'])(
    'passes fwmark %s to syncconf with the peers',
    async (fwmark) => {
      mockWireGuard(fwmark);
      expect(await wg.sync('wg0')).toBe(
        `[Interface]\nFwMark = ${fwmark}\n${stripped}\n`
      );
    }
  );

  test.each(['show', 'strip', 'syncconf'])(
    'propagates a %s failure',
    async (command) => {
      mockWireGuard('0xca6d', command);
      await expect(wg.sync('wg0')).rejects.toMatchObject({ code: 42 });
    }
  );
});
