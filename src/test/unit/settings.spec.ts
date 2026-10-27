import { describe, expect, test } from 'vitest';

import { databaseFixture } from '../helpers/database';
import { resetCryptoMocks } from '../helpers/crypto';

import * as settings from '#server/features/settings';
import { roles } from '#shared/utils/permissions';

describe('general settings', () => {
  test('authorizes before hashing and never mutates the caller input', async () => {
    const { store } = await databaseFixture();
    const crypto = resetCryptoMocks();
    const data = {
      ...(await store.general.getConfig()),
      metricsPassword: 'secret',
    };
    await expect(
      settings.update({ id: 2, role: roles.CLIENT }, data)
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(crypto.hashPassword).not.toHaveBeenCalled();
    await settings.update({ id: 1, role: roles.ADMIN }, data);
    expect(data.metricsPassword).toBe('secret');
    expect((await store.general.getConfig()).metricsPassword).toBe(
      'hash:secret'
    );
    await settings.update(
      { id: 1, role: roles.ADMIN },
      { ...data, metricsPassword: 'hash:secret' }
    );
    expect(crypto.hashPassword).toHaveBeenCalledOnce();
  });

  test('checks metrics credentials and feature enablement', async () => {
    const { store } = await databaseFixture();
    resetCryptoMocks();
    await settings.update(
      { id: 1, role: roles.ADMIN },
      {
        ...(await store.general.getConfig()),
        metricsJson: true,
        metricsPrometheus: false,
        metricsPassword: 'secret',
      }
    );
    await expect(settings.authorizeMetrics('json')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Unauthorized',
    });
    await expect(
      settings.authorizeMetrics('json', { method: 'Basic', value: 'secret' })
    ).rejects.toThrow('Bearer Auth required');
    await expect(
      settings.authorizeMetrics('json', { method: 'Bearer', value: 'wrong' })
    ).rejects.toThrow('Incorrect token');
    await expect(
      settings.authorizeMetrics('json', { method: 'Bearer', value: 'secret' })
    ).resolves.toBeUndefined();
    await expect(
      settings.authorizeMetrics('prometheus', {
        method: 'Bearer',
        value: 'secret',
      })
    ).rejects.toThrow('Metrics not enabled');
  });
});
