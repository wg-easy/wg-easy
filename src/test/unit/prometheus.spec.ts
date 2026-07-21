import { describe, expect, test } from 'vitest';

import {
  escapePrometheusLabelValue,
  formatPrometheusLabels,
} from '#server/utils/prometheus';

describe('Prometheus label formatting', () => {
  test('escapes quotes, backslashes, and newlines in label values', () => {
    expect(escapePrometheusLabelValue('vpn"client')).toBe('vpn\\"client');
    expect(escapePrometheusLabelValue('path\\client')).toBe('path\\\\client');
    expect(escapePrometheusLabelValue('line one\nline two')).toBe(
      'line one\\nline two'
    );
  });

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
