import type { Lang } from '../types';
import type { System } from './model';

/**
 * Interface for system-related database operations.
 * This interface provides methods for retrieving system configuration data
 * and specific system properties, such as the language setting, from the database.
 */
export default interface SystemRepository {
  /**
   * Retrieves the system configuration data from the database.
   * @returns {Promise<System | null>} A promise that resolves to the system data
   * if found, or `undefined` if the system data is not available.
   */
  getSystem(): Promise<System | null>;

  /**
   * Retrieves the system's language setting.
   * @returns {Promise<Lang>} The current language setting of the system.
   */
  getLang(): Promise<Lang>;
}
