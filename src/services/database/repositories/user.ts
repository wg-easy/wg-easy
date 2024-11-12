import type { DeepReadonly } from 'vue';

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
  id: string;
  role: ROLE;
  username: string;
  password: string;
  name: string;
  email: string | null;
  /** ISO String */
  createdAt: string;
  /** ISO String */
  updatedAt: string;
  enabled: boolean;
};

/**
 * Interface for user-related database operations.
 * This interface provides methods for managing user data.
 */
export abstract class UserRepository {
  abstract findAll(): Promise<DeepReadonly<User[]>>;
  abstract findById(id: string): Promise<DeepReadonly<User | undefined>>;

  abstract create(username: string, password: string): Promise<void>;
  abstract update(user: User): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
