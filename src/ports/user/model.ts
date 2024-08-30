import type { Address, ID, Key, HashPassword } from '../types';

/**
 * Represents user roles within the application, each with specific permissions :
 *
 * - `ADMIN`: Full permissions to all resources, including the app, database, etc
 * - `EDITOR`: Granted write and read permissions on their own resources as well as
 *   `CLIENT` resources, but without `ADMIN` privileges
 * - `CLIENT`: Granted write and read permissions only on their own resources.
 */
export type ROLE = 'ADMIN' | 'EDITOR' | 'CLIENT';

/**
 * Representing a user data structure.
 */
export type User = {
  id: ID;
  role: ROLE;
  username: string;
  password: HashPassword;
  name?: string;
  address?: Address;
  privateKey?: Key;
  publicKey?: Key;
  preSharedKey?: string;
  createdAt: Date;
  updatedAt: Date;
  enabled: boolean;
};
