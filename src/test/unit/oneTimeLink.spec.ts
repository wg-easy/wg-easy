import { describe, expect, test } from 'vitest';
import { generateOtlToken } from '../../server/database/repositories/oneTimeLink/token';

describe('OTL token generation', () => {
  test('generates a non-empty string', () => {
    expect(typeof generateOtlToken()).toBe('string');
    expect(generateOtlToken().length).toBeGreaterThan(0);
  });

  test('token is a 64-character lowercase hex string', () => {
    const token = generateOtlToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  test('consecutive tokens are unique', () => {
    const tokens = new Set(Array.from({ length: 10 }, generateOtlToken));
    expect(tokens.size).toBe(10);
  });
});
