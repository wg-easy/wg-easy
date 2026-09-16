import { describe, expect, test } from 'vitest';

import { omitClientSecrets } from '#server/utils/clientPublic';

describe('omitClientSecrets', () => {
  test('removes privateKey and preSharedKey from a client row', () => {
    const publicClient = omitClientSecrets({
      id: 1,
      name: 'phone',
      publicKey: 'pub',
      privateKey: 'priv',
      preSharedKey: 'psk',
      ipv4Address: '10.8.0.2',
    });

    expect(publicClient).toEqual({
      id: 1,
      name: 'phone',
      publicKey: 'pub',
      ipv4Address: '10.8.0.2',
    });
    expect('privateKey' in publicClient).toBe(false);
    expect('preSharedKey' in publicClient).toBe(false);
  });
});
