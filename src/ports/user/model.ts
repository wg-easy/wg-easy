import type { Address, ID, Key, HashPassword, String, Boolean } from '../types';

export enum ROLE {
  /* Full permissions to any resources (app, database...) */
  ADMIN = 'ADMIN',
  /* Grants write and read permissions on their own resources and `CLIENT` resources without `ADMIN` permissions */
  EDITOR = 'EDITOR',
  /* Grants write and read permissions on their own resources  */
  CLIENT = 'CLIENT',
}

/**
 * Representing a user data structure.
 */
export type User = {
  id: ID;
  role: ROLE;
  username: String;
  password: HashPassword;
  name?: String;
  address?: Address;
  privateKey?: Key;
  publicKey?: Key;
  preSharedKey?: String;
  createdAt: Date;
  updatedAt: Date;
  enabled: Boolean;
};
