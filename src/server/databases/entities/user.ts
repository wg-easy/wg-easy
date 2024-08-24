import type { Address, Key, PassordHash } from './system';

export type ROLE = 'ADMIN';

/**
 * Representing a user data structure.
 */
type User = {
  id: string;
  roles: Array<ROLE>;
  username: string;
  password: PassordHash;
  name: string;
  address: Address;
  privateKey: Key;
  publicKey: Key;
  preSharedKey: string;
  createdAt: Date;
  updatedAt: Date;
  enabled: boolean;
};

export default User;
