import { describe, expect, test } from 'vitest';

import {
  getQuotaTimezones,
  resolveBrowserTimezone,
  resolveQuotaClientIds,
} from '../../app/utils/quotaForm';

describe('quota form client assignment', () => {
  test('forces a quota created for a client to remain assigned to that client', () => {
    expect(resolveQuotaClientIds([], 42)).toEqual([42]);
    expect(resolveQuotaClientIds([7, 42], 42)).toEqual([42]);
  });

  test('preserves selected clients for shared quota management', () => {
    expect(resolveQuotaClientIds([7, 42])).toEqual([7, 42]);
  });
});

describe('quota form timezones', () => {
  test('uses the browser timezone for new quotas', () => {
    expect(resolveBrowserTimezone(() => 'America/Vancouver')).toBe(
      'America/Vancouver'
    );
  });

  test('falls back to UTC when the browser timezone is unavailable', () => {
    expect(
      resolveBrowserTimezone(() => {
        throw new Error('Intl unavailable');
      })
    ).toBe('UTC');
  });

  test('provides common regional fallbacks and keeps saved timezones', () => {
    const timezones = getQuotaTimezones('Pacific/Auckland', () => {
      throw new Error('supportedValuesOf unavailable');
    });

    expect(timezones).toEqual(
      expect.arrayContaining([
        'UTC',
        'America/New_York',
        'Asia/Taipei',
        'Europe/London',
        'Pacific/Auckland',
      ])
    );
  });

  test('combines the supported IANA list with UTC and a saved timezone', () => {
    expect(
      getQuotaTimezones('Legacy/Timezone', () => [
        'America/Chicago',
        'Asia/Tokyo',
      ])
    ).toEqual(['America/Chicago', 'Asia/Tokyo', 'Legacy/Timezone', 'UTC']);
  });
});
