export type Undefined = null | undefined | 0 | '';
/**
 * `id` of T or T.
 *
 * @template T - The specific type that can be used in place of id string.
 */
export type Identity<T> = string | T;

/**
 * Abstract class for database operations.
 * Provides methods to connect, disconnect, and interact with system and user data.
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
}
