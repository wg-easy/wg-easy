import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, test } from 'vitest';

const directory = mkdtempSync(join(tmpdir(), 'wg-easy-healthcheck-'));
const script = fileURLToPath(
  new URL('../../../scripts/healthcheck.sh', import.meta.url)
);

for (const backend of ['wg', 'awg']) {
  writeFileSync(
    join(directory, backend),
    `#!/bin/sh\nprintf '%s\\n' '${backend}' "$@"\nexit "\${MOCK_SHOW_STATUS:-0}"\n`,
    { mode: 0o755 }
  );
}
writeFileSync(
  join(directory, 'modinfo'),
  '#!/bin/sh\nexit "${MOCK_MODULE_STATUS:-1}"\n',
  { mode: 0o755 }
);

afterAll(() => rmSync(directory, { recursive: true, force: true }));

function environment(overrides: Record<string, string> = {}) {
  return {
    ...process.env,
    PATH: `${directory}:${process.env.PATH}`,
    EXPERIMENTAL_AWG: '',
    OVERRIDE_AUTO_AWG: '',
    WG_INTERFACE: '',
    MOCK_MODULE_STATUS: '1',
    MOCK_SHOW_STATUS: '0',
    ...overrides,
  };
}

describe('container healthcheck', () => {
  test.each([
    [{}, 'wg'],
    [{ OVERRIDE_AUTO_AWG: 'awg' }, 'wg'],
    [{ EXPERIMENTAL_AWG: 'true', OVERRIDE_AUTO_AWG: 'AWG' }, 'awg'],
    [
      {
        EXPERIMENTAL_AWG: 'true',
        OVERRIDE_AUTO_AWG: 'WG',
        MOCK_MODULE_STATUS: '0',
      },
      'wg',
    ],
    [{ EXPERIMENTAL_AWG: 'true', MOCK_MODULE_STATUS: '0' }, 'awg'],
    [{ EXPERIMENTAL_AWG: 'true' }, 'wg'],
    [
      {
        EXPERIMENTAL_AWG: 'true',
        OVERRIDE_AUTO_AWG: 'invalid',
        MOCK_MODULE_STATUS: '0',
      },
      'awg',
    ],
  ])('selects the backend for %j', (overrides, backend) => {
    expect(
      execFileSync('/bin/sh', [script], {
        env: environment(overrides),
        encoding: 'utf8',
      })
    ).toBe(`${backend}\nshow\nwg0\nlisten-port\n`);
  });

  test('checks the configured interface', () => {
    expect(
      execFileSync('/bin/sh', [script], {
        env: environment({ WG_INTERFACE: 'vpn-home' }),
        encoding: 'utf8',
      })
    ).toBe('wg\nshow\nvpn-home\nlisten-port\n');
  });

  test('fails when the interface cannot be queried', () => {
    const result = spawnSync('/bin/sh', [script], {
      env: environment({ MOCK_SHOW_STATUS: '1' }),
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
  });
});
