import { parseCidr } from 'cidr-tools';
import { describe, expect, test } from 'vitest';

import { nextIPFromUsedAddresses } from '#server/utils/ip';

describe('nextIPFromUsedAddresses', () => {
  test('returns the first available address, skipping reserved and allocated addresses', () => {
    const usedAddresses = new Set(['10.0.0.2', '10.0.0.4']);

    expect(
      nextIPFromUsedAddresses(4, parseCidr('10.0.0.0/29'), usedAddresses)
    ).toBe('10.0.0.3');
  });

  test('throws when every usable address is allocated', () => {
    const usedAddresses = new Set([
      '10.0.0.2',
      '10.0.0.3',
      '10.0.0.4',
      '10.0.0.5',
      '10.0.0.6',
    ]);

    expect(() =>
      nextIPFromUsedAddresses(4, parseCidr('10.0.0.0/29'), usedAddresses)
    ).toThrow('Maximum number of clients reached');
  });
});
