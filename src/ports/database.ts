import type SystemRepository from './system/interface';
import type UserRepository from './user/interface';
import type { Identity, Undefined, Lang, String } from './types';
import type { User } from './user/model';
import type { System } from './system/model';

/**
 * Abstract class for database operations.
 * Provides methods to connect, disconnect, and interact with system and user data.
 *
 * *Note : Throw with `DatabaseError` to ensure API handling errors.*
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
  abstract getUser(_id: Identity<User>): Promise<User | Undefined>;
  abstract newUserWithPassword(
    _username: String,
    _password: String
  ): Promise<void>;
  abstract saveUser(_user: User): Promise<void>;
  abstract deleteUser(_id: Identity<User>): Promise<void>;
}

export class DatabaseError extends Error {
  static readonly ERROR_PASSWORD_REQ =
    'Password does not meet the strength requirements. It must be at least 12 characters long, with at least one uppercase letter, one lowercase letter, one number, and one special character.';
  static readonly ERROR_USER_EXIST = 'User already exists.';
  static readonly ERROR_DATABASE_CONNECTION =
    'Failed to connect to the database.';
  static readonly ERROR_USERNAME_LEN =
    'Username must be longer than 8 characters.';

  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}
