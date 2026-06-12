// ! Auto Imports are not supported in this file

import argon2 from 'argon2';
import { deserialize } from '@phc/format';

const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$jsh6z1/SbZHYAiO/Ww9HZw$ikzkoXWqc2b0Pc4O8ZNJjp1xKZSb7SNM/3dPMNUPk9Y';

/**
 * Checks if `password` matches the `hash`.
 *
 * Checks against `DUMMY_HASH` and returns false if `hash` is null
 */
export async function isPasswordValid(
  password: string,
  hash: string | null
): Promise<boolean> {
  if (hash === null) {
    await argon2.verify(DUMMY_HASH, password);
    return false;
  }
  return argon2.verify(hash, password);
}

/**
 * Hashes a password.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

/**
 * Checks if the password hash is valid.
 * This only checks if the hash is a valid PHC formatted string using argon2.
 */
export function isValidPasswordHash(hash: string): boolean {
  try {
    const obj = deserialize(hash);

    if (obj.id !== 'argon2i' && obj.id !== 'argon2d' && obj.id !== 'argon2id') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
