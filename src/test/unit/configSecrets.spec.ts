import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeEach, expect, test, vi } from 'vitest';

const directory = mkdtempSync(join(tmpdir(), 'wg-easy-secrets-'));
const providers = ['google', 'github', 'oidc'] as const;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('PORT', '51821');
  vi.stubEnv('OAUTH_PROVIDERS', providers.join(','));
  for (const provider of providers) {
    const prefix = `OAUTH_${provider.toUpperCase()}`;
    vi.stubEnv(`${prefix}_CLIENT_ID`, provider);
    vi.stubEnv(`${prefix}_CLIENT_SECRET`, undefined);
    vi.stubEnv(`${prefix}_CLIENT_SECRET_FILE`, undefined);
  }
  vi.stubEnv('INIT_PASSWORD', undefined);
  vi.stubEnv('INIT_PASSWORD_FILE', undefined);
});

afterEach(() => vi.unstubAllEnvs());
afterAll(() => rmSync(directory, { recursive: true, force: true }));

function setSecretFile(name: string, contents: string) {
  const path = join(directory, name);
  writeFileSync(path, contents);
  vi.stubEnv(`${name}_FILE`, path);
}

test('loads each file at startup and removes only one final line ending', async () => {
  setSecretFile('OAUTH_GOOGLE_CLIENT_SECRET', '  google secret  \n');
  setSecretFile('OAUTH_GITHUB_CLIENT_SECRET', 'github-secret\r\n');
  setSecretFile('OAUTH_OIDC_CLIENT_SECRET', 'oidc-secret');
  setSecretFile('INIT_PASSWORD', 'bootstrap\npassword\n\n');

  const { WG_ENV, OAUTH_PROVIDERS, WG_INITIAL_ENV } =
    await import('#server/utils/config');

  expect(WG_ENV.OAUTH_PROVIDERS).toEqual(providers);
  expect(OAUTH_PROVIDERS.google.clientSecret).toBe('  google secret  ');
  expect(OAUTH_PROVIDERS.github.clientSecret).toBe('github-secret');
  expect(OAUTH_PROVIDERS.oidc.clientSecret).toBe('oidc-secret');
  expect(WG_INITIAL_ENV.PASSWORD).toBe('bootstrap\npassword\n');
});

test('preserves direct values and leaves absent secrets undefined', async () => {
  vi.stubEnv('OAUTH_OIDC_CLIENT_SECRET', 'oidc-secret');
  vi.stubEnv('INIT_PASSWORD', '  bootstrap password\n');

  const { WG_ENV, OAUTH_PROVIDERS, WG_INITIAL_ENV } =
    await import('#server/utils/config');

  expect(WG_ENV.OAUTH_PROVIDERS).toEqual(['oidc']);
  expect(OAUTH_PROVIDERS.oidc.clientSecret).toBe('oidc-secret');
  expect(OAUTH_PROVIDERS.google.clientSecret).toBeUndefined();
  expect(WG_INITIAL_ENV.PASSWORD).toBe('  bootstrap password\n');
});

test.each(['direct-secret', ''])(
  'rejects both sources when set',
  async (value) => {
    vi.stubEnv('INIT_PASSWORD', value);
    setSecretFile('INIT_PASSWORD', 'file-secret');

    await expect(import('#server/utils/config')).rejects.toThrow(
      new Error('Set only one of INIT_PASSWORD and INIT_PASSWORD_FILE')
    );
  }
);

test('rejects an unreadable secret file at startup', async () => {
  vi.stubEnv('OAUTH_OIDC_CLIENT_SECRET_FILE', join(directory, 'missing'));

  await expect(import('#server/utils/config')).rejects.toThrow(
    new Error(
      'Cannot read the secret file specified by OAUTH_OIDC_CLIENT_SECRET_FILE'
    )
  );
});

test.each(['', '\n', '\r\n'])(
  'rejects an empty secret file',
  async (contents) => {
    setSecretFile('INIT_PASSWORD', contents);

    await expect(import('#server/utils/config')).rejects.toThrow(
      new Error('The secret file specified by INIT_PASSWORD_FILE is empty')
    );
  }
);
