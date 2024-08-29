import type SystemRepository from './system/interface';
import type UserRepository from './user/interface';
import type { Identity, Undefined, Lang } from './types';
import type { User } from './user/model';
import type { System } from './system/model';

/**
 * Abstract class for database operations.
 * Provides methods to connect, disconnect, and interact with system and user data.
 */
export default abstract class DatabaseProvider
  implements SystemRepository, UserRepository
{
  /**
   * Connects to the database.
   */
  connect(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  /**
   * Disconnects from the database.
   */
  disconnect(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  getSystem(): Promise<System | Undefined> {
    throw new Error('Method not implemented.');
  }
  getLang(): Promise<Lang> {
    throw new Error('Method not implemented.');
  }

  getUsers(): Promise<Array<User>> {
    throw new Error('Method not implemented.');
  }
  getUser(_id: Identity<User>): Promise<User | Undefined> {
    throw new Error('Method not implemented.');
  }
  saveUser(_user: User): Promise<void> {
    throw new Error('Method not implemented.');
  }
  deleteUser(_id: Identity<User>): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
