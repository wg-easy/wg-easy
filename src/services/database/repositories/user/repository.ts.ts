import type { ID } from '../types';
import type { User } from './model';

/**
 * Interface for user-related database operations.
 * This interface provides methods for managing user data.
 */
export default interface UserRepository {
  /**
   * Retrieves all users from the database.
   * @returns {Promise<Array<User>>} A array of users data.
   */
  getUsers(): Promise<Array<User>>;

  /**
   * Retrieves a user by their ID or User object from the database.
   * @param {ID} id - The ID of the user or a User object.
   * @returns {Promise<User | undefined>} A promise that resolves to the user data
   * if found, or `undefined` if the user is not available.
   */
  getUser(id: ID): Promise<User | undefined>;

  newUserWithPassword(username: string, password: string): Promise<void>;

  /**
   * Updates a user in the database.
   * @param {User} user - The user to be saved.
   *
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  updateUser(user: User): Promise<void>;

  /**
   * Deletes a user from the database.
   * @param {ID} id - The ID of the user or a User object to be deleted.
   * @returns {Promise<void>} A promise that resolves when the user has been deleted.
   */
  deleteUser(id: ID): Promise<void>;
}
