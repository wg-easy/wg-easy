export type ROLE = 'ADMIN';

/**
 * Representing a user data structure.
 */
type User = {
  id: string;
  roles: Array<ROLE>;
  name: string;
  address: string;
  privateKey: string;
  publicKey: string;
  preSharedKey: string;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
};

export default User;
