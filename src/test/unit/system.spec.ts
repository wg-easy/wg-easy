import { afterEach, expect, test, vi } from 'vitest';

import { requestEvent } from '../helpers/request';

const { fetchRelease, environment } = vi.hoisted(() => ({
  fetchRelease: vi.fn(),
  environment: {
    DISABLE_VERSION_CHECK: false,
    INSECURE: false,
    WG_EXECUTABLE: 'awg',
  },
}));

vi.mock('ofetch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('ofetch')>()),
  $fetch: fetchRelease,
}));
vi.mock('#server/utils/config', () => ({
  RELEASE: '15.5.0',
  WG_ENV: environment,
  SERVER_DEBUG: vi.fn(),
}));

afterEach(() => {
  environment.DISABLE_VERSION_CHECK = false;
});

async function fixture() {
  vi.resetModules();
  fetchRelease.mockReset();
  const { databaseFixture } = await import('../helpers/database');
  const { store } = await databaseFixture();
  await store.interfaces.update({ firewallEnabled: true });
  const { default: handler } = await import('#server/api/information.get');
  return () => handler(requestEvent('http://localhost/api/information'));
}

test('preserves local capabilities when the release check fails and retries on the next request', async () => {
  const information = await fixture();
  fetchRelease.mockRejectedValueOnce(new Error('GitHub unavailable'));
  fetchRelease.mockResolvedValue({
    tag_name: 'v15.6.0',
    body: 'Release notes\r\n\r\nMore details',
  });

  await expect(information()).resolves.toEqual({
    currentRelease: '15.5.0',
    latestRelease: { version: '15.5.0', changelog: '' },
    updateAvailable: false,
    insecure: false,
    isAwg: true,
    firewallEnabled: true,
  });

  const recovered = await information();
  expect(recovered).toMatchObject({
    latestRelease: { version: 'v15.6.0', changelog: 'Release notes' },
    updateAvailable: true,
    isAwg: true,
    firewallEnabled: true,
  });
  expect(fetchRelease).toHaveBeenCalledTimes(2);
});

test('returns local capabilities without fetching when version checks are disabled', async () => {
  const information = await fixture();
  environment.DISABLE_VERSION_CHECK = true;

  await expect(information()).resolves.toMatchObject({
    latestRelease: { version: '15.5.0', changelog: '' },
    updateAvailable: false,
    isAwg: true,
    firewallEnabled: true,
  });
  expect(fetchRelease).not.toHaveBeenCalled();
});
