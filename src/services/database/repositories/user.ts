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
export interface UserRepository {
  /**
   * Retrieves all users from the database.
   */
  getUsers(): Promise<User[]>;

  /**
   * Retrieves a user by their ID or User object from the database.
   */
  getUser(id: string): Promise<User | undefined>;

  createUser(username: string, password: string): Promise<void>;

  /**
   * Updates a user in the database.
   */
  updateUser(user: User): Promise<void>;

  /**
   * Deletes a user from the database.
   */
  deleteUser(id: string): Promise<void>;
}
