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
 * Checks if a password is strong based on following criteria :
 *
 * - minimum length of 12 characters
 * - contains at least one uppercase letter
 * - contains at least one lowercase letter
 * - contains at least one number
 * - contains at least one special character (e.g., !@#$%^&*(),.?":{}|<>).
 *
 * @param {string} password - The password to validate
 * @returns {boolean} `true` if the password is strong, otherwise `false`
 */

export function isPasswordStrong(password: string): boolean {
  if (password.length < 12) {
    return false;
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
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
