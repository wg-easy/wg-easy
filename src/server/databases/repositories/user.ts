import type User from '../entities/user';
import type { Identity, Undefined } from '../database';

/**
 * Abstract class for user-related database operations.
 * This class provides methods for retrieving and saving user data.
 */
export default abstract class UserRepository {
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
