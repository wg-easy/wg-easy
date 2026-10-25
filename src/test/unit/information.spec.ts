import { beforeEach, describe, expect, test, vi } from 'vitest';

import information from '#server/api/information.get';

const { fetchRelease, getInterface } = vi.hoisted(() => ({
  fetchRelease: vi.fn(),
  getInterface: vi.fn(),
}));

vi.mock('#server/utils/Database', () => ({
  default: {
    interfaces: {
      get: () => getInterface(),
    },
  },
}));

vi.mock('#server/utils/config', () => ({
  RELEASE: 'v15.5.0',
  WG_ENV: {
    INSECURE: false,
    WG_EXECUTABLE: 'awg',
  },
}));

vi.mock('#server/utils/release', () => ({
  cachedFetchLatestRelease: () => fetchRelease(),
}));

describe('GET /api/information', () => {
  beforeEach(() => {
    fetchRelease.mockReset();
    getInterface.mockReset();
    getInterface.mockResolvedValue({ firewallEnabled: true });
  });

  test('returns firewall and Amnezia flags when the release lookup fails', async () => {
    fetchRelease.mockRejectedValue(new Error('github down'));

    await expect(information({} as never)).resolves.toMatchObject({
      currentRelease: 'v15.5.0',
      updateAvailable: false,
      isAwg: true,
      firewallEnabled: true,
      latestRelease: { version: 'v15.5.0', changelog: '' },
    });
  });

  test('still reports an update when the lookup succeeds', async () => {
    fetchRelease.mockResolvedValue({
      version: 'v15.6.0',
      changelog: 'notes',
    });

    await expect(information({} as never)).resolves.toMatchObject({
      updateAvailable: true,
      firewallEnabled: true,
      latestRelease: { version: 'v15.6.0', changelog: 'notes' },
    });
  });
});
