import { describe, expect, test } from 'vitest';

import { formatPrometheusLabels } from '#server/utils/prometheus';

describe('Prometheus label formatting', () => {
  test('formats escaped values without changing scalar values', () => {
    expect(
      formatPrometheusLabels({
        interface: 'wg"0',
        enabled: true,
        name: 'home\\office\npeer',
      })
    ).toBe('interface="wg\\"0",enabled="true",name="home\\\\office\\npeer"');
  });
});
