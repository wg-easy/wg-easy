import { describe, expect, test } from 'vitest';

import { AllowedIpsSchema } from '#server/utils/types';

describe('AllowedIpsSchema', () => {
  test('accepts plain IPs and CIDRs', () => {
    const result = AllowedIpsSchema.safeParse([
      '10.0.0.1',
      '10.0.0.0/24',
      '0.0.0.0/0',
      '2001:db8::1',
      '::/0',
    ]);

    expect(result.success).toBe(true);
  });

  test('rejects comma-joined entries', () => {
    expect(
      AllowedIpsSchema.safeParse(['10.0.0.0/24,10.0.1.0/24']).success
    ).toBe(false);
  });

  test('rejects whitespace-padded entries', () => {
    expect(AllowedIpsSchema.safeParse([' 10.0.0.0/24']).success).toBe(false);
    expect(AllowedIpsSchema.safeParse(['10.0.0.0/24 ']).success).toBe(false);
    expect(
      AllowedIpsSchema.safeParse(['10.0.0.0/24, 10.0.1.0/24']).success
    ).toBe(false);
  });

  test('rejects entries that are not an IP or CIDR', () => {
    expect(AllowedIpsSchema.safeParse(['example.com']).success).toBe(false);
    expect(AllowedIpsSchema.safeParse(['10.0.0.0/33']).success).toBe(false);
    expect(AllowedIpsSchema.safeParse(['10.0.0.1:443']).success).toBe(false);
  });

  test('rejects an empty list', () => {
    expect(AllowedIpsSchema.safeParse([]).success).toBe(false);
  });
});
