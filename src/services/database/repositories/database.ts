import type { System, SystemRepository } from './system';
import type { User, UserRepository } from './user';
import type { Lang } from './types';

// Represent data structure
export type Database = {
  // TODO: always return correct value, greatly improves code
  system: System | null;
  users: User[];
};

export const DEFAULT_DATABASE: Database = {
  system: null,
  users: [],
};

/**
 * Abstract class for database operations.
 * Provides methods to connect, disconnect, and interact with system and user data.
 *
 * **Note :** Always throw `DatabaseError` to ensure proper API error handling.
 *
 */
export abstract class DatabaseProvider
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

  abstract getSystem(): Promise<System | null>;
  abstract getLang(): Promise<Lang>;

  abstract getUsers(): Promise<User[]>;
  abstract getUser(id: string): Promise<User | undefined>;
  abstract newUserWithPassword(
    username: string,
    password: string
  ): Promise<void>;
  abstract updateUser(user: User): Promise<void>;
  abstract deleteUser(id: string): Promise<void>;
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
 * // event handler routes
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
 * @extends {Error}
 */
export class DatabaseError extends Error {
  static readonly ERROR_INIT = 'errorInit';
  static readonly ERROR_PASSWORD_REQ = 'errorPasswordReq';
  static readonly ERROR_USER_EXIST = 'errorUserExist';
  static readonly ERROR_DATABASE_CONNECTION = 'errorDatabaseConn';
  static readonly ERROR_USERNAME_REQ = 'errorUsernameReq';

  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}
