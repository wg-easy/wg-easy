import type SystemRepository from './system/interface';
import type UserRepository from './user/interface';
import type { Undefined, Lang, ID } from './types';
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
  abstract getUser(id: ID): Promise<User | Undefined>;
  abstract newUserWithPassword(
    username: string,
    password: string
  ): Promise<void>;
  abstract updateUser(_user: User): Promise<void>;
  abstract deleteUser(id: ID): Promise<void>;
}

export class DatabaseError extends Error {
  static readonly ERROR_PASSWORD_REQ = 'errorPasswordReq';
  static readonly ERROR_USER_EXIST = 'errorUserExist';
  static readonly ERROR_DATABASE_CONNECTION = 'errorDatabaseConn';
  static readonly ERROR_USERNAME_REQ = 'errorUsernameReq';

  constructor(messageKey: string) {
    const { t } = useI18n();
    const message = t(messageKey);
    super(message);
    this.name = 'DatabaseError';
  }
}
