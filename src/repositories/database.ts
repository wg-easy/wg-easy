import type SystemRepository from './system/repository';
import type UserRepository from './user/repository.ts';
import type { Undefined, Lang, ID } from './types';
import type { User } from './user/model';
import type { System } from './system/model';

/**
 * Abstract class for database operations.
 * Provides methods to connect, disconnect, and interact with system and user data.
 *
 * **Note :** Always throw `DatabaseError` to ensure proper API error handling.
 *
 */
export default abstract class DatabaseProvider
  implements SystemRepository, UserRepository
{
  /**
   * Connects to the database.
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnects from the database.
   */
  abstract disconnect(): Promise<void>;

  abstract getSystem(): Promise<System | Undefined>;
  abstract getLang(): Promise<Lang>;

  abstract getUsers(): Promise<Array<User>>;
  abstract getUser(id: ID): Promise<User | Undefined>;
  abstract newUserWithPassword(
    username: string,
    password: string
  ): Promise<void>;
  abstract updateUser(_user: User): Promise<void>;
  abstract deleteUser(id: ID): Promise<void>;
}

/**
 * Represents a specialized error class for database-related operations.
 * This class is designed to work with internationalization (i18n) by using message keys.
 * The actual error messages are expected to be retrieved using these keys from an i18n system.
 *
 * ### Usage:
 * When throwing a `DatabaseError`, you provide an i18n key as the message.
 * The key will be used by the i18n system to retrieve the corresponding localized error message.
 *
 * Example:
 * ```typescript
 * throw new DatabaseError(DatabaseError.ERROR_PASSWORD_REQ);
 * ...
 * if (error instanceof DatabaseError) {
 *   const t = await useTranslation(event);
 *   throw createError({
 *     statusCode: 400,
 *     statusMessage: t(error.message),
 *     message: error.message,
 *   });
 * } else {
 *   throw createError('Something happened !');
 * }
 * ```
 *
 * ### Constructor:
 * - `constructor(message: string)`: Creates a new `DatabaseError` with the provided i18n message key.
 *
 * @extends {Error}
 */
export class DatabaseError extends Error {
  static readonly ERROR_PASSWORD_REQ = 'errorPasswordReq';
  static readonly ERROR_USER_EXIST = 'errorUserExist';
  static readonly ERROR_DATABASE_CONNECTION = 'errorDatabaseConn';
  static readonly ERROR_USERNAME_REQ = 'errorUsernameReq';

  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}
