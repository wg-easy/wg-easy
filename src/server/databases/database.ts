import type System from './entities/system';
import type User from './entities/user';

type Undefined = null | undefined | 0 | '';

/**
 * `id` of T or T.
 *
 * @template T - The specific type that can be used in place of id string.
 */
type Identity<T> = string | T;

export { Undefined, Identity };

/**
 * Abstract class for database operations.
 * Provides methods to connect, disconnect, and interact with system and user data.
 *
 * **Note:** This class does not handle errors directly. Error handling should be implemented in the API methods
 * that use this class. The methods here should not throw errors themselves but should rely on the consuming code
 * to manage any exceptions or failures.
 */
export default abstract class DatabaseProvider {
  /**
   * Connects to the database.
   */
  abstract connect(): Promise<void>;
  /**
   * Disconnects from the database.
   */
  abstract disconnect(): Promise<void>;

  /**
   * Retrieves system data from the database.
   * @returns {Promise<System | Undefined>} The system data or null if not found.
   */
  abstract getSystem(): Promise<System | Undefined>;

  /**
   * Retrieves a user by their ID or by User structure from the database.
   * @param {Identity<User>} id - The ID of the user or a user.
   * @returns {Promise<User | Undefined>} The user data or null if not found.
   */
  abstract getUser(id: Identity<User>): Promise<User | Undefined>;

  /**
   * Creates or Updates a user in the database.
   * @param {User} user - The user to be saved.
   *
   * **Note:** If the user already exists, this method will update their details.
   * If the user does not exist, it will create a new user entry.
   */
  abstract saveUser(user: User): Promise<void>;
}
