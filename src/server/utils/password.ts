import bcrypt from 'bcryptjs';

/**
 * Checks if `password` matches the user password.
 *
 * @param {string} password string to test
 * @returns {boolean} `true` if matching user password, otherwise `false`
 */
export function isPasswordValid(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * Hashes a password.
 *
 * @param {string} password - The plaintext password to hash
 * @returns {string} The hash of the password
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}
