import type { Identity, String, Undefined } from '../types';
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
   * @param {Identity<User>} id - The ID of the user or a User object.
   * @returns {Promise<User | Undefined>} A promise that resolves to the user data
   * if found, or `undefined` if the user is not available.
   */
  getUser(id: Identity<User>): Promise<User | Undefined>;

  newUserWithPassword(username: String, password: String): Promise<void>;

  /**
   * Creates or updates a user in the database.
   * @param {User} user - The user to be saved.
   *
   * **Note:** If the user already exists, this method will update their details.
   * If the user does not exist, it will create a new user entry.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  saveUser(user: User): Promise<void>;

  /**
   * Deletes a user from the database.
   * @param {Identity<User>} id - The ID of the user or a User object to be deleted.
   * @returns {Promise<void>} A promise that resolves when the user has been deleted.
   */
  deleteUser(id: Identity<User>): Promise<void>;
}
