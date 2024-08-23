import bcrypt from 'bcryptjs';

/**
 * Checks if `password` matches the PASSWORD_HASH.
 *
 * If environment variable is not set, the password is always invalid.
 *
 * @param {string} password String to test
 * @returns {boolean} true if matching environment, otherwise false
 */
export function isPasswordValid(password: string, hash?: string): boolean {
  if (hash) {
    return bcrypt.compareSync(password, hash);
  }

  return false;
}
