import { expect, test, describe } from 'vitest';
import {
  hashPassword,
  isPasswordValid,
  isValidPasswordHash,
} from '../../server/utils/password';

describe('password', () => {
  test('password', async () => {
    const hash = await hashPassword('password');

    await expect(isPasswordValid('password', hash)).resolves.toBe(true);
    await expect(isPasswordValid('wrong', hash)).resolves.toBe(false);

    expect(isValidPasswordHash('not a hash')).toBe(false);
    expect(isValidPasswordHash(hash)).toBe(true);

    expect(isValidPasswordHash(hash.replace('argon2', 'argon3'))).toBe(false);
  });
});
