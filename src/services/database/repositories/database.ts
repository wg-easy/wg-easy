import type { ClientRepository, Client } from './client';
import type { SetupRepository, Steps } from './setup';
import type { System, SystemRepository } from './system';
import type { User, UserRepository } from './user';

// Represent data structure
export type Database = {
  migrations: string[];
  setup: Steps;
  system: System;
  users: User[];
  clients: Record<string, Client>;
};

export const DEFAULT_DATABASE: Database = {
  migrations: [],
  setup: 1,
  system: null as never,
  users: [],
  clients: {},
};

/**
 * Abstract class for database operations.
 * Provides methods to connect, disconnect, and interact with system and user data.
 */
export abstract class DatabaseProvider {
  /**
   * Connects to the database.
   */
  static connect(): Promise<DatabaseProvider> {
    throw new Error('Not implemented');
  }

  /**
   * Disconnects from the database.
   */
  abstract disconnect(): Promise<void>;

  abstract setup: SetupRepository;
  abstract system: SystemRepository;
  abstract user: UserRepository;
  abstract client: ClientRepository;
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
 * throw new DatabaseError(DatabaseError.ERROR_INIT);
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

  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}
