import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { describe, expect, test, vi } from 'vitest';

import { wg } from '#server/utils/wgHelper';

const { exec } = vi.hoisted(() => ({ exec: vi.fn() }));

vi.mock('#server/utils/cmd', () => ({ exec }));
vi.mock('#server/utils/config', () => ({
  WG_ENV: { WG_EXECUTABLE: 'wg' },
}));

const runBash = promisify(execFile);
const stripped = '[Interface]\nListenPort = 51820\n[Peer]\nAllowedIPs = ::/0';

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
