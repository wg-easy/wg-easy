import bcrypt from 'bcryptjs';

import { PASSWORD_HASH } from "~/utils/config";

/**
 * Checks if `password` matches the PASSWORD_HASH.
 *
 * If environment variable is not set, the password is always invalid.
 *
 * @param {string} password String to test
 * @returns {boolean} true if matching environment, otherwise false
 */
export function isPasswordValid(password: string): boolean {
    if (typeof password !== 'string') {
      return false;
    }
  
    if (PASSWORD_HASH) {
      return bcrypt.compareSync(password, PASSWORD_HASH);
    }
  
    return false;
  };