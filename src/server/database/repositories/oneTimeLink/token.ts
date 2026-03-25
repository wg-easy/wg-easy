import { randomBytes } from 'node:crypto';

/**
 * Generates a cryptographically secure one-time link token.
 * Returns a 64-character lowercase hex string (256 bits of entropy).
 */
export function generateOtlToken(): string {
  return randomBytes(32).toString('hex');
}
