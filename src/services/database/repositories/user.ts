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
  /**
   * Retrieves all users from the database.
   */
  abstract findAll(): Promise<User[]>;

  /**
   * Retrieves a user by their ID or User object from the database.
   */
  abstract findById(id: string): Promise<User | undefined>;

  abstract create(username: string, password: string): Promise<void>;

  /**
   * Updates a user in the database.
   */
  abstract update(user: User): Promise<void>;

  /**
   * Deletes a user from the database.
   */
  abstract delete(id: string): Promise<void>;
}
