import argon2 from 'argon2';

/**
 * Checks if `password` matches the hash.
 */
export function isPasswordValid(
  password: string,
  hash: string
): Promise<boolean> {
  return argon2.verify(hash, password);
}

/**
 * Hashes a password.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}
